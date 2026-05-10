import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import type { SessionCacheStats } from "@shared/types";

export interface ClearCacheConfirmDialogProps {
  open: boolean;
  stats: SessionCacheStats | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Destructive-action confirmation. Shows the per-table row counts so the
 * user can see what they're about to lose, and singles out manually-edited
 * chunks (real user work) into a separate warning line.
 */
export function ClearCacheConfirmDialog({
  open,
  stats,
  busy,
  onCancel,
  onConfirm,
}: ClearCacheConfirmDialogProps) {
  const t = useT();
  const totalRows =
    (stats?.parsedDocuments ?? 0) +
    (stats?.chunkingRuns ?? 0) +
    (stats?.chunks ?? 0);
  const isEmpty = stats !== null && totalRows === 0;
  const manualCount = stats?.manuallyEditedChunks ?? 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()} modal={busy}>
      <DialogHeader title={t("data.confirmTitle")} onClose={busy ? undefined : onCancel} />
      <DialogBody>
        <p className="text-xs text-muted-foreground">{t("data.confirmDescription")}</p>

        {stats && !isEmpty && (
          <ul className="flex flex-col gap-1 rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs">
            <StatsRow label={t("data.statsParsedDocs")} value={stats.parsedDocuments} />
            <StatsRow label={t("data.statsChunkingRuns")} value={stats.chunkingRuns} />
            <StatsRow label={t("data.statsChunks")} value={stats.chunks} />
          </ul>
        )}

        {isEmpty && (
          <p className="text-xs text-muted-foreground">{t("data.confirmEmpty")}</p>
        )}

        {manualCount > 0 && (
          <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {t("data.confirmManualWarning", { count: manualCount })}
            </span>
          </p>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {t("data.confirmCancel")}
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy || isEmpty}>
          {busy ? t("data.clearing") : t("data.confirmClear")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function StatsRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium tabular-nums">{value.toLocaleString()}</span>
    </li>
  );
}
