import { useCallback, useEffect, useRef, useState } from "react";
import { chunkerClient, ChunkerError } from "@/services/chunker-client";
import { initialValuesForProfile, isFormReady } from "@/lib/profileFieldDefaults";
import type { IndexableDocument } from "@/hooks/session/types";
import type {
  IngestProgress,
  IngestStartRequest,
  IngestSummary,
  SchemaProfile,
} from "@shared/types";

export type IndexResult =
  | { ok: true; fileName: string; summary: IngestSummary }
  | { ok: false; fileName: string; error: string };

export type IndexAllPhase =
  | { kind: "idle" }
  | {
      kind: "running";
      currentIndex: number; // 0-based
      total: number;
      currentFileName: string;
      currentProgress: IngestProgress | null;
      results: IndexResult[];
    }
  | {
      kind: "done";
      total: number;
      results: IndexResult[];
    }
  | { kind: "error"; message: string; missingConfig: boolean };

export interface IndexAllFlow {
  phase: IndexAllPhase;
  start: (profile: SchemaProfile, docs: IndexableDocument[]) => Promise<void>;
  reset: () => void;
}

/** Side-effect surface the batch runner needs. Injected from the hook
 *  so tests can substitute a mock without standing up Electron. */
export interface IndexAllDeps {
  ingest: (request: IngestStartRequest) => Promise<IngestSummary>;
  newJobId: () => string;
}

/**
 * Sequentially indexes every document against `profile`. Pure async
 * function — no React, no module-level state — so a unit test can
 * drive it with a mocked ingest and watch the emitted phases.
 *
 * Per-doc errors are recorded and the loop continues; missing-config
 * errors abort the whole batch (every doc would fail the same way).
 */
export async function runIndexAllBatch(
  profile: SchemaProfile,
  docs: IndexableDocument[],
  deps: IndexAllDeps,
  emit: (next: IndexAllPhase) => void,
): Promise<void> {
  if (docs.length === 0) return;

  const total = docs.length;
  const results: IndexResult[] = [];

  emit({
    kind: "running",
    currentIndex: 0,
    total,
    currentFileName: docs[0].fileName,
    currentProgress: null,
    results: [],
  });

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const values = initialValuesForProfile(profile, doc.fileName);

    emit({
      kind: "running",
      currentIndex: i,
      total,
      currentFileName: doc.fileName,
      currentProgress: null,
      results: [...results],
    });

    if (!isFormReady(profile, values)) {
      // Skip with a per-doc error rather than aborting the batch — the
      // typical cause is a filename that doesn't yield a usable
      // title/slug and the operator needs to fix it manually.
      results.push({
        ok: false,
        fileName: doc.fileName,
        error: "Missing required field — fill it via the single-doc dialog",
      });
      continue;
    }

    try {
      const summary = await deps.ingest({
        jobId: deps.newJobId(),
        profileId: profile.id,
        documentFieldValues: values,
        chunks: doc.chunks,
      });
      results.push({ ok: true, fileName: doc.fileName, summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // A missing-config error is batch-fatal: the OpenAI key and the
      // Postgres URL are global, so a second doc would just hit the
      // same wall. Bail and surface a Settings affordance.
      const missingConfig =
        err instanceof ChunkerError &&
        /missing.*(openaiApiKey|databaseUrl|ollamaUrl)/i.test(message);
      if (missingConfig) {
        emit({ kind: "error", message, missingConfig: true });
        return;
      }
      results.push({ ok: false, fileName: doc.fileName, error: message });
    }
  }

  emit({ kind: "done", total, results });
}

function genJobId(): string {
  return `idxall-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/**
 * React wrapper around `runIndexAllBatch`. Owns the phase state and a
 * progress subscription so the dialog can render the inner
 * "embedding chunk X of Y" bar. The subscription is scoped by the
 * outer phase's currentJobId — events from a doc whose ingest already
 * returned are dropped.
 */
export function useIndexAllFlow(): IndexAllFlow {
  const [phase, setPhase] = useState<IndexAllPhase>({ kind: "idle" });
  const lastJobId = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = chunkerClient.onIngestProgress((progress) => {
      if (!lastJobId.current || progress.jobId !== lastJobId.current) return;
      setPhase((p) =>
        p.kind === "running" ? { ...p, currentProgress: progress } : p,
      );
    });
    return unsubscribe;
  }, []);

  const reset = useCallback(() => {
    lastJobId.current = null;
    setPhase({ kind: "idle" });
  }, []);

  const start = useCallback(
    (profile: SchemaProfile, docs: IndexableDocument[]) =>
      runIndexAllBatch(
        profile,
        docs,
        {
          ingest: (req) => {
            // Stash the jobId so the progress subscription can scope.
            lastJobId.current = req.jobId;
            return chunkerClient.ingest(req);
          },
          newJobId: genJobId,
        },
        setPhase,
      ),
    [],
  );

  return { phase, start, reset };
}
