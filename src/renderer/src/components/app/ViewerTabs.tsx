import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import type { DocumentView } from "@/hooks/useChunkerSession";

export interface ViewerTabsProps {
  view: DocumentView;
  parsedEnabled: boolean;
  onChangeView: (view: DocumentView) => void;
}

export function ViewerTabs({ view, parsedEnabled, onChangeView }: ViewerTabsProps) {
  const t = useT();
  return (
    <div
      role="tablist"
      className="inline-flex items-center rounded-lg border border-border bg-secondary/40 p-0.5"
    >
      <TabButton
        active={view === "raw"}
        onClick={() => onChangeView("raw")}
        label={t("viewer.tabOriginal")}
      />
      <TabButton
        active={view === "parsed"}
        onClick={() => parsedEnabled && onChangeView("parsed")}
        disabled={!parsedEnabled}
        title={parsedEnabled ? undefined : t("viewer.tabParsedDisabled")}
        label={t("viewer.tabParsed")}
      />
    </div>
  );
}

function TabButton({
  active,
  disabled = false,
  title,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  title?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 items-center rounded-md px-3 text-xs font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
