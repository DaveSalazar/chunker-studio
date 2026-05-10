import { useMemo } from "react";
import type {
  ChunkerSession,
  ChunkerSessionState,
  DocumentEntry,
  IndexableDocument,
} from "./types";
import { effectiveSettingsFor } from "./helpers";

type Totals = ChunkerSession["totals"];

export interface DerivedSession {
  active: DocumentEntry | null;
  effectiveSettings: ChunkerSession["effectiveSettings"];
  totals: Totals;
  loadedPaths: ReadonlySet<string>;
  parsedPaths: ReadonlySet<string>;
  indexableDocuments: IndexableDocument[];
}

/** Per-render memoized projections used by the workspace + folder UI. */
export function useDerived(state: ChunkerSessionState): DerivedSession {
  const active = useMemo(
    () => state.documents.find((d) => d.id === state.activeId) ?? null,
    [state.documents, state.activeId],
  );

  const effectiveSettings = useMemo(
    () =>
      active
        ? effectiveSettingsFor(active, state.scope, state.globalSettings)
        : state.globalSettings,
    [active, state.scope, state.globalSettings],
  );

  const totals = useMemo<Totals>(() => {
    let chunks = 0, tokens = 0, usd = 0;
    for (const doc of state.documents) {
      if (!doc.result) continue;
      chunks += doc.result.chunks.length;
      tokens += doc.result.totalTokens;
      usd += doc.result.estimatedCostUsd;
    }
    return { documents: state.documents.length, chunks, tokens, usd };
  }, [state.documents]);

  const loadedPaths = useMemo(
    () => new Set(state.documents.map((d) => d.file.path)),
    [state.documents],
  );
  const parsedPaths = useMemo(
    () =>
      new Set(
        state.documents
          .filter((d) => d.parsed !== null)
          .map((d) => d.file.path),
      ),
    [state.documents],
  );

  // Indexable = parsed + chunked + at least one chunk produced.
  // Scanned PDFs land in "ready" with `result === null` because the
  // chunking pipeline is skipped, so the result-and-length check
  // already excludes them — no extra unsupportedReason guard needed.
  const indexableDocuments = useMemo<IndexableDocument[]>(
    () =>
      state.documents
        .filter((d) => d.loading === "ready" && d.result && d.result.chunks.length > 0)
        .map((d) => ({
          id: d.id,
          fileName: d.file.name,
          path: d.file.path,
          chunks: d.result!.chunks,
          totalTokens: d.result!.totalTokens,
        })),
    [state.documents],
  );

  return {
    active,
    effectiveSettings,
    totals,
    loadedPaths,
    parsedPaths,
    indexableDocuments,
  };
}
