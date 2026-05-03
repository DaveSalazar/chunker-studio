import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CloudUpload } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/Dialog";
import { IngestFooter, type IngestPhase } from "@/components/app/IngestFooter";
import { IngestForm } from "@/components/app/IngestForm";
import {
  IngestErrorView,
  IngestProgressView,
  IngestSuccessView,
} from "@/components/app/IngestPhaseViews";
import {
  isFormReady,
  useIngestProfileState,
} from "@/hooks/useIngestProfileState";
import { useT } from "@/lib/i18n";
import { chunkerClient, ChunkerError } from "@/services/chunker-client";
import { PRICE_PER_M_TOKENS_USD, type ChunkRecord } from "@shared/types";

/**
 * Soft cap on a template body's token count. Above this, the operator
 * sees a warning so they know each draft request that retrieves this
 * template will spend more on input tokens (the body is what the LLM
 * receives as scaffold). Non-blocking; ingestion proceeds either way.
 */
const TEMPLATE_BODY_TOKEN_WARN_LIMIT = 8000;

export interface IngestDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;

  documentName: string | null;
  /** Effective chunks to embed + insert. Derived in the parent. */
  chunks: ChunkRecord[];
  /** Estimated total tokens to use for the cost preview. */
  estimatedTokens: number;

  onOpenSettings: () => void;
}

function genJobId(): string {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function IngestDialog({
  open,
  onOpenChange,
  documentName,
  chunks,
  estimatedTokens,
  onOpenSettings,
}: IngestDialogProps) {
  const t = useT();
  const profileState = useIngestProfileState(open, documentName);
  const { profile, profiles, values, loadError, selectProfile, changeValue } =
    profileState;
  const [phase, setPhase] = useState<IngestPhase>({ kind: "idle" });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Reset phase whenever the dialog opens for a fresh run.
  useEffect(() => {
    if (open) setPhase({ kind: "idle" });
  }, [open, documentName]);

  // Stream progress events while open. The job id baked into the event
  // lets us ignore stragglers from a previous run.
  useEffect(() => {
    if (!open) return;
    const unsubscribe = chunkerClient.onIngestProgress((progress) => {
      if (activeJobId && progress.jobId !== activeJobId) return;
      setPhase((current) =>
        current.kind === "running" ? { kind: "running", progress } : current,
      );
    });
    return unsubscribe;
  }, [open, activeJobId]);

  const estimatedCost = useMemo(
    () => (estimatedTokens / 1_000_000) * PRICE_PER_M_TOKENS_USD,
    [estimatedTokens],
  );

  // Surface a per-chunk warning when any whole-document body crosses the
  // template token threshold. Computed only over chunks that actually
  // carry a body — article-aware chunks won't trigger this.
  const heavyBodyTokens = useMemo(() => {
    let max = 0;
    for (const c of chunks) {
      if (c.body !== null && c.tokenCount > max) max = c.tokenCount;
    }
    return max >= TEMPLATE_BODY_TOKEN_WARN_LIMIT ? max : null;
  }, [chunks]);

  const start = async () => {
    if (!profile || !isFormReady(profile, values)) return;
    const jobId = genJobId();
    setActiveJobId(jobId);
    setPhase({
      kind: "running",
      progress: {
        jobId,
        phase: "embedding",
        processed: 0,
        total: chunks.length,
        tokensSoFar: 0,
      },
    });
    try {
      const summary = await chunkerClient.ingest({
        jobId,
        profileId: profile.id,
        documentFieldValues: values,
        chunks,
      });
      setPhase({ kind: "done", summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const missingConfig =
        err instanceof ChunkerError &&
        /missing.*(openaiApiKey|databaseUrl|ollamaUrl)/i.test(message);
      setPhase({ kind: "error", message, missingConfig });
    }
  };

  const close = () => {
    if (phase.kind === "running") return; // Don't allow closing mid-job
    onOpenChange(false);
  };

  const canStart = chunks.length > 0 && isFormReady(profile, values);

  return (
    <Dialog open={open} onOpenChange={close} modal={phase.kind === "running"}>
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <CloudUpload className="h-4 w-4 text-primary" />
            {t("ingest.title")}
          </span>
        }
        description={t("ingest.description")}
        onClose={phase.kind === "running" ? undefined : close}
      />
      <DialogBody className="gap-5">
        {phase.kind === "idle" &&
          (loadError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {loadError}
            </p>
          ) : (
            <>
              {heavyBodyTokens !== null && (
                <p className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    {t("ingest.bodyTokenWarning", {
                      tokens: heavyBodyTokens.toLocaleString(),
                    })}
                  </span>
                </p>
              )}
              <IngestForm
                profile={profile}
                profiles={profiles}
                onSelectProfile={selectProfile}
                values={values}
                onChangeValue={changeValue}
                chunkCount={chunks.length}
                estimatedCostUsd={estimatedCost}
              />
            </>
          ))}
        {phase.kind === "running" && <IngestProgressView progress={phase.progress} />}
        {phase.kind === "done" && <IngestSuccessView summary={phase.summary} />}
        {phase.kind === "error" && (
          <IngestErrorView message={phase.message} missingConfig={phase.missingConfig} />
        )}
      </DialogBody>
      <DialogFooter>
        <IngestFooter
          phase={phase}
          canStart={canStart}
          onStart={start}
          onClose={close}
          onRetry={start}
          onOpenSettings={onOpenSettings}
        />
      </DialogFooter>
    </Dialog>
  );
}
