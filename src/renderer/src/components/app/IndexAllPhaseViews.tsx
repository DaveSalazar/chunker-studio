import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useT } from "@/lib/i18n";
import type { IndexAllPhase, IndexResult } from "@/hooks/useIndexAllFlow";

export function IndexAllRunningView({
  phase,
}: {
  phase: Extract<IndexAllPhase, { kind: "running" }>;
}) {
  const t = useT();
  const outerPct = phase.total > 0 ? (phase.currentIndex / phase.total) * 100 : 0;
  const inner = phase.currentProgress;
  const innerPct =
    inner && inner.total > 0 ? (inner.processed / inner.total) * 100 : 0;
  return (
    <div className="flex flex-col gap-3">
      <ProgressBar value={outerPct} />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        {t("indexAll.runningOuter", {
          index: phase.currentIndex + 1,
          total: phase.total,
          name: phase.currentFileName,
        })}
      </div>
      {inner && (
        <div className="flex flex-col gap-1.5 rounded-md border border-border bg-secondary/30 px-3 py-2">
          <ProgressBar value={inner.phase === "writing" ? undefined : innerPct} />
          <span className="font-mono text-[11px] text-muted-foreground">
            {inner.phase === "writing"
              ? t("ingest.writing")
              : t("ingest.embedding", {
                  processed: inner.processed,
                  total: inner.total,
                })}
          </span>
        </div>
      )}
    </div>
  );
}

export function IndexAllDoneView({
  results,
}: {
  results: IndexResult[];
}) {
  const t = useT();
  const okCount = results.filter((r) => r.ok).length;
  const errCount = results.length - okCount;
  const insertedTotal = results
    .filter((r): r is Extract<IndexResult, { ok: true }> => r.ok)
    .reduce((s, r) => s + r.summary.chunksInserted, 0);
  return (
    <div className="flex flex-col gap-3">
      <div
        className={
          "flex flex-col gap-2 rounded-lg border p-3 " +
          (errCount === 0
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : "border-amber-500/40 bg-amber-500/10 text-amber-300")
        }
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          {t("indexAll.summary", {
            ok: okCount,
            total: results.length,
            chunks: insertedTotal.toLocaleString(),
          })}
        </div>
        {errCount > 0 && (
          <span className="text-xs">
            {t("indexAll.summaryErrors", { count: errCount })}
          </span>
        )}
      </div>
      <ResultList results={results} />
    </div>
  );
}

function ResultList({ results }: { results: IndexResult[] }) {
  return (
    <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border border-border bg-secondary/20 px-2 py-1.5 text-xs">
      {results.map((r, i) => (
        <li key={`${i}-${r.fileName}`} className="flex items-start gap-2">
          {r.ok ? (
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-mono text-[11px]">{r.fileName}</span>
            <span
              className={
                "text-[11px] " +
                (r.ok ? "text-muted-foreground" : "text-destructive/90")
              }
            >
              {r.ok
                ? `+${r.summary.chunksInserted} chunk${r.summary.chunksInserted === 1 ? "" : "s"}`
                : r.error}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function IndexAllErrorView({
  message,
  missingConfig,
}: {
  message: string;
  missingConfig: boolean;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        {missingConfig ? t("ingest.missingConfigTitle") : t("indexAll.errorTitle")}
      </div>
      <p className="text-xs text-destructive/90">
        {missingConfig ? t("ingest.missingConfigDescription") : message}
      </p>
    </div>
  );
}
