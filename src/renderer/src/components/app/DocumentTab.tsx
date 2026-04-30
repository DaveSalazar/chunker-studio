import { X } from "lucide-react";
import { StatusDot } from "@/components/app/StatusDot";
import { cn } from "@/lib/cn";
import { fileTypeIcon } from "@/lib/fileTypeIcon";
import { extensionOf } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { DocumentEntry } from "@/hooks/useChunkerSession";

export interface DocumentTabProps {
  doc: DocumentEntry;
  active: boolean;
  /** True when this tab is the IDE-style preview/temp tab. */
  temp: boolean;
  onSelect: () => void;
  /** Promote a temp tab to permanent (no-op when already permanent). */
  onPromote: () => void;
  onClose: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * One tab strip entry — selectable button + close X. The wrapping div
 * carries `data-context-trigger="true"` so the parent's right-click
 * menu can swap targets without racing with the React handler. See
 * `components/ui/ContextMenu.tsx`.
 */
export function DocumentTab({
  doc,
  active,
  temp,
  onSelect,
  onPromote,
  onClose,
  onContextMenu,
}: DocumentTabProps) {
  const t = useT();
  const { Icon, iconColor } = fileTypeIcon(extensionOf(doc.file.name));
  const chunkCount = doc.result?.chunks.length;
  const hasOverride = !!doc.overrides;

  return (
    <div
      data-context-trigger="true"
      onContextMenu={onContextMenu}
      title={temp ? t("tabs.previewTitle") : undefined}
      className={cn(
        "group relative flex h-8 shrink-0 items-center gap-2 rounded-md border px-3 text-xs transition-all",
        active
          ? "border-primary/50 bg-primary/10 text-foreground shadow-sm"
          : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onPromote}
        className="flex items-center gap-2 outline-none"
      >
        <StatusDot loading={doc.loading} />
        <Icon className={cn("h-3.5 w-3.5", iconColor, !active && "opacity-70")} />
        <span
          className={cn(
            "max-w-[180px] truncate font-medium",
            temp && "italic",
          )}
        >
          {doc.file.name}
        </span>
        {hasOverride && (
          <span
            title={t("tabs.hasOverride")}
            className="rounded-full bg-primary/20 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-primary"
          >
            {t("tabs.overrideBadge")}
          </span>
        )}
        {chunkCount !== undefined && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {chunkCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={t("tabs.closeDocument", { name: doc.file.name })}
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground/70 transition-colors",
          "hover:bg-destructive/20 hover:text-destructive",
        )}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
