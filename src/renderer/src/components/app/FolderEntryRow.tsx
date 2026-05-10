import { CheckCircle2, FilePlus2 } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/cn";
import { fileTypeIcon } from "@/lib/fileTypeIcon";
import { formatBytes } from "@/lib/format";
import type { FolderEntry } from "@shared/types";

export interface FolderEntryRowProps {
  entry: FolderEntry;
  /** True once parsing has completed for this entry's file. */
  parsed: boolean;
  /** Show the subfolder path as a small subtitle. Defaults to true for
   *  flat-list contexts; tree-view callers pass false because the
   *  parent folder already provides the path context. */
  showRelativePath?: boolean;
  /** Select-to-Index checkbox state. When `checked` is omitted (undefined),
   *  the checkbox is hidden — used by callers that don't participate in
   *  selection (e.g. earlier flat-list contexts before the tree). */
  checked?: boolean;
  onToggleChecked?: () => void;
  /**
   * Called on click (single → preview/temp tab) and on double-click
   * (permanent open). The boolean tells the caller which mode to use.
   */
  onLoad: (permanent: boolean) => void;
}

export function FolderEntryRow({
  entry,
  parsed,
  showRelativePath = true,
  checked,
  onToggleChecked,
  onLoad,
}: FolderEntryRowProps) {
  const { Icon, iconColor } = fileTypeIcon(entry.extension);
  const tooltip =
    entry.relativePath !== entry.name
      ? `${entry.name} — ${entry.relativePath}`
      : entry.name;
  return (
    <li className="flex items-center gap-1.5">
      {checked !== undefined && onToggleChecked && (
        <Checkbox
          checked={checked}
          onChange={onToggleChecked}
          ariaLabel={`Indexar ${entry.name}`}
          className="ml-2"
        />
      )}
      <button
        type="button"
        onClick={() => onLoad(false)}
        onDoubleClick={() => onLoad(true)}
        title={tooltip}
        className="group flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary/60"
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            parsed ? "text-emerald-400" : iconColor,
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium text-foreground">
            {entry.name}
          </span>
          {showRelativePath && entry.relativePath !== entry.name && (
            <span className="truncate text-[10px] font-mono text-muted-foreground">
              {entry.relativePath}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {formatBytes(entry.size)}
        </span>
        {parsed ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        ) : (
          <FilePlus2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    </li>
  );
}
