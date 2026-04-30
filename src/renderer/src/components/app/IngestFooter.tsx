import { CloudUpload, Loader2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import type { IngestProgress, IngestSummary } from "@shared/types";

export type IngestPhase =
  | { kind: "idle" }
  | { kind: "running"; progress: IngestProgress }
  | { kind: "done"; summary: IngestSummary }
  | { kind: "error"; message: string; missingConfig: boolean };

export interface IngestFooterProps {
  phase: IngestPhase;
  canStart: boolean;
  onStart: () => void;
  onClose: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}

export function IngestFooter({
  phase,
  canStart,
  onStart,
  onClose,
  onRetry,
  onOpenSettings,
}: IngestFooterProps) {
  const t = useT();
  if (phase.kind === "idle") {
    return (
      <>
        <Button variant="outline" onClick={onClose}>
          {t("ingest.cancel")}
        </Button>
        <Button onClick={onStart} disabled={!canStart}>
          <CloudUpload />
          {t("ingest.start")}
        </Button>
      </>
    );
  }
  if (phase.kind === "running") {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="animate-spin" />
        {t("ingest.embedding", {
          processed: phase.progress.processed,
          total: phase.progress.total,
        })}
      </Button>
    );
  }
  if (phase.kind === "done") {
    return <Button onClick={onClose}>{t("ingest.closeOnDone")}</Button>;
  }
  return (
    <>
      {phase.missingConfig && (
        <Button variant="outline" onClick={onOpenSettings}>
          <Settings2 />
          {t("ingest.openSettings")}
        </Button>
      )}
      <Button variant="outline" onClick={onClose}>
        {t("ingest.closeOnDone")}
      </Button>
      <Button onClick={onRetry}>{t("ingest.retry")}</Button>
    </>
  );
}
