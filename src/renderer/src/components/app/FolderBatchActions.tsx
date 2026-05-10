import { CloudUpload, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";

export interface FolderBatchActionsProps {
  remainingCount: number;
  indexableCount: number;
  /** Folder entry count — used to decide whether Re-parse All has
   *  anything to act on. Re-parse touches every entry (including
   *  already-parsed ones), so its enablement gate is "any files
   *  loaded?", not "any UNPARSED files?". */
  totalCount: number;
  parseAllDisabled: boolean;
  parseAllTitle: string;
  indexAllTitle: string;
  reparseAllTitle: string;
  onParseAll: () => void;
  onReparseAll: () => void;
  onIndexAll: () => void;
}

/**
 * The three batch buttons under the folder filter:
 *   - Parse all   — kicks off parsing every UNPARSED folder entry.
 *   - Re-parse all — forces a re-parse of every entry, bypassing the
 *                    SQLite parse cache. Used after pure-function
 *                    changes (placeholders.ts, field extraction) where
 *                    file bytes are unchanged but the cached output
 *                    is stale.
 *   - Index all   — ships every loaded + ready document to corpus_chunks.
 *
 * Always rendered, disabled when their respective counts are zero, so
 * their position in the layout doesn't shift between runs. Pulled out
 * of FolderPanel to keep that file under the 180-line cap.
 */
export function FolderBatchActions({
  remainingCount,
  indexableCount,
  totalCount,
  parseAllDisabled,
  parseAllTitle,
  indexAllTitle,
  reparseAllTitle,
  onParseAll,
  onReparseAll,
  onIndexAll,
}: FolderBatchActionsProps) {
  const t = useT();
  return (
    <>
      <Button
        variant="primary"
        size="sm"
        className="h-8 shrink-0 whitespace-nowrap"
        onClick={onParseAll}
        disabled={parseAllDisabled}
        title={parseAllTitle}
      >
        <Wand2 className="h-3.5 w-3.5" />
        {remainingCount > 0
          ? t("folder.parseAllCount", { count: remainingCount })
          : t("folder.parseAll")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 shrink-0 whitespace-nowrap"
        onClick={onReparseAll}
        disabled={totalCount === 0}
        title={reparseAllTitle}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {totalCount > 0
          ? t("folder.reparseAllCount", { count: totalCount })
          : t("folder.reparseAll")}
      </Button>
      <Button
        variant="primary"
        size="sm"
        className="h-8 shrink-0 whitespace-nowrap"
        onClick={onIndexAll}
        disabled={indexableCount === 0}
        title={indexAllTitle}
      >
        <CloudUpload className="h-3.5 w-3.5" />
        {indexableCount > 0
          ? t("folder.indexAllCount", { count: indexableCount })
          : t("folder.indexAll")}
      </Button>
    </>
  );
}
