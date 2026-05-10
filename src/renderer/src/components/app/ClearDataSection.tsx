import { useEffect, useState } from "react";
import { Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ClearCacheConfirmDialog } from "@/components/app/ClearCacheConfirmDialog";
import { DialogSection } from "@/components/app/DialogSection";
import { useT } from "@/lib/i18n";
import { chunkerClient } from "@/services/chunker-client";
import type { SessionCacheStats } from "@shared/types";

export interface ClearDataSectionProps {
  /** True when the parent settings dialog is open. Triggers a stats reload. */
  active: boolean;
  /**
   * Fired after the SQLite cache is wiped. Owners should drop any
   * in-memory copies of parsed text / chunk arrays — otherwise open
   * documents keep rendering data that no longer exists on disk.
   */
  onAfterClear?: () => void;
}

/**
 * "Internal cache" panel inside Preferences → Data. Shows row counts for
 * the SQLite session cache and a destructive button that opens a
 * confirmation dialog before wiping the parsed/chunking tables.
 *
 * Connection settings, profiles, and API keys live in config.json and are
 * intentionally untouched by this flow — see chunker config repository.
 */
export function ClearDataSection({ active, onAfterClear }: ClearDataSectionProps) {
  const t = useT();
  const [stats, setStats] = useState<SessionCacheStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "clearing" | "cleared">("idle");

  // Re-read stats every time the dialog re-opens. The counts can drift
  // while the dialog is closed (background ingestion, parsing, etc.) so a
  // stale snapshot would mislead the user about what's about to be wiped.
  useEffect(() => {
    if (!active) return;
    setError(null);
    setPhase("idle");
    setStats(null);
    chunkerClient
      .getCacheStats()
      .then(setStats)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [active]);

  const refreshStats = async () => {
    try {
      setStats(await chunkerClient.getCacheStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleConfirm = async () => {
    setPhase("clearing");
    setError(null);
    try {
      await chunkerClient.clearCache();
      // Fire BEFORE refreshing stats: callers typically reset session
      // state which closes open tabs, dropping the in-memory parse/chunk
      // arrays that would otherwise keep rendering after the DB wipe.
      onAfterClear?.();
      await refreshStats();
      setPhase("cleared");
      setConfirmOpen(false);
      window.setTimeout(() => setPhase("idle"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
    }
  };

  return (
    <DialogSection
      icon={<Database className="h-4 w-4 text-primary" />}
      title={t("data.sectionTitle")}
      description={t("data.sectionDescription")}
    >
      <div className="flex flex-col gap-3">
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {t("data.statsError", { message: error })}
          </p>
        )}

        <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs">
          {stats === null && !error ? (
            <span className="text-muted-foreground">{t("data.statsLoading")}</span>
          ) : (
            <ul className="flex flex-col gap-1">
              <StatRow label={t("data.statsParsedDocs")} value={stats?.parsedDocuments ?? 0} />
              <StatRow label={t("data.statsChunkingRuns")} value={stats?.chunkingRuns ?? 0} />
              <StatRow label={t("data.statsChunks")} value={stats?.chunks ?? 0} />
              <StatRow
                label={t("data.statsManualEdits")}
                value={stats?.manuallyEditedChunks ?? 0}
                highlight={Boolean(stats && stats.manuallyEditedChunks > 0)}
              />
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={stats === null || phase === "clearing"}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {phase === "cleared" ? t("data.cleared") : t("data.clearButton")}
          </Button>
        </div>
      </div>

      <ClearCacheConfirmDialog
        open={confirmOpen}
        stats={stats}
        busy={phase === "clearing"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
      />
    </DialogSection>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          "font-mono font-medium tabular-nums " +
          (highlight ? "text-destructive" : "")
        }
      >
        {value.toLocaleString()}
      </span>
    </li>
  );
}
