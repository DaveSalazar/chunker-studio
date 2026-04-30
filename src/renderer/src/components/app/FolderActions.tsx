import { ChevronDown, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";

export interface FolderActionsProps {
  hasSelection: boolean;
  collapsed: boolean;
  loading: "idle" | "listing";
  onRefresh: () => void;
  onCloseFolder: () => void;
  onToggleCollapsed?: () => void;
}

export function FolderActions({
  hasSelection,
  collapsed,
  loading,
  onRefresh,
  onCloseFolder,
  onToggleCollapsed,
}: FolderActionsProps) {
  const t = useT();
  return (
    <div className="flex items-center gap-1">
      {hasSelection && !collapsed && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label={t("folder.refresh")}
            onClick={onRefresh}
            disabled={loading === "listing"}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading === "listing" && "animate-spin")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label={t("folder.close")}
            onClick={onCloseFolder}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      {onToggleCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t("folder.expand") : t("folder.collapse")}
          aria-expanded={!collapsed}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-secondary hover:text-foreground",
          )}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")}
          />
        </button>
      )}
    </div>
  );
}
