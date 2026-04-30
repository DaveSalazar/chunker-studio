import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useT } from "@/lib/i18n";
import {
  PRICE_PER_M_TOKENS_USD,
  type IngestProgress,
  type IngestSummary,
} from "@shared/types";

export function IngestProgressView({ progress }: { progress: IngestProgress }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <ProgressBar
        value={
          progress.phase === "writing"
            ? undefined
            : progress.total > 0
              ? (progress.processed / progress.total) * 100
              : 0
        }
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        {progress.phase === "writing"
          ? t("ingest.writing")
          : t("ingest.embedding", {
              processed: progress.processed,
              total: progress.total,
            })}
      </div>
      {progress.tokensSoFar > 0 && (
        <span className="font-mono text-[11px] text-muted-foreground">
          {progress.tokensSoFar.toLocaleString()} tok ·{" "}
          ~${((progress.tokensSoFar / 1_000_000) * PRICE_PER_M_TOKENS_USD).toFixed(4)}
        </span>
      )}
    </div>
  );
}

export function IngestSuccessView({ summary }: { summary: IngestSummary }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        {t("ingest.successTitle")}
      </div>
      <ul className="flex flex-col gap-1 text-xs text-emerald-200/80">
        <li className="font-mono">
          {t("ingest.successInserted", {
            count: summary.chunksInserted.toLocaleString(),
          })}
        </li>
        {summary.chunksDeleted > 0 && (
          <li className="font-mono">
            {t("ingest.successDeleted", {
              count: summary.chunksDeleted.toLocaleString(),
            })}
          </li>
        )}
        {summary.promptTokens > 0 && (
          <li className="font-mono">
            {t("ingest.successTokens", {
              tokens: summary.promptTokens.toLocaleString(),
            })}
          </li>
        )}
      </ul>
    </div>
  );
}

export function IngestErrorView({
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
        {missingConfig ? t("ingest.missingConfigTitle") : t("ingest.errorTitle")}
      </div>
      <p className="text-xs text-destructive/90">
        {missingConfig ? t("ingest.missingConfigDescription") : message}
      </p>
    </div>
  );
}
