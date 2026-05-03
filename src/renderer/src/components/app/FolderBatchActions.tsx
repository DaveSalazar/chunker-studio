import { CloudUpload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";

export interface FolderBatchActionsProps {
  remainingCount: number;
  indexableCount: number;
  parseAllDisabled: boolean;
  parseAllTitle: string;
  indexAllTitle: string;
  onParseAll: () => void;
  onIndexAll: () => void;
}

/**
 * The two batch buttons under the folder filter:
 *   - Parse all   — kicks off parsing every unparsed folder entry.
 *   - Index all   — ships every loaded + ready document to corpus_chunks.
 *
 * Always rendered, disabled when their respective counts are zero, so
 * their position in the layout doesn't shift between runs. Pulled out
 * of FolderPanel to keep that file under the 180-line cap.
 */
export function FolderBatchActions({
  remainingCount,
  indexableCount,
  parseAllDisabled,
  parseAllTitle,
  indexAllTitle,
  onParseAll,
  onIndexAll,
}: FolderBatchActionsProps) {
  const t = useT();
  return (
    <>
      <Button
        variant="primary"
        size="sm"
        className="h-8"
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
        variant="primary"
        size="sm"
        className="h-8 w-full"
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
