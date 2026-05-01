import {
  FileText,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import logoUrl from "@/assets/logo.png";

export interface TopBarProps {
  documentName?: string;
  isDark?: boolean;
  onToggleTheme?: () => void;

  /** When true, the sidebar is visible. Toggle button reflects state. */
  sidebarVisible?: boolean;
  onToggleSidebar?: () => void;

  onOpenSettings?: () => void;
}

export function TopBar({
  documentName,
  isDark = true,
  onToggleTheme,
  sidebarVisible = true,
  onToggleSidebar,
  onOpenSettings,
}: TopBarProps) {
  const t = useT();
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/40 px-4 backdrop-blur",
        "[-webkit-app-region:drag]",
      )}
    >
      <div className="flex items-center gap-2 pl-16 [-webkit-app-region:no-drag]">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            aria-label={
              sidebarVisible ? t("topbar.hideSidebar") : t("topbar.showSidebar")
            }
            aria-pressed={!sidebarVisible}
            title={
              sidebarVisible ? t("topbar.hideSidebar") : t("topbar.showSidebar")
            }
          >
            {sidebarVisible ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
        )}
        <img
          src={logoUrl}
          alt=""
          aria-hidden
          className="h-8 w-8 shrink-0 select-none"
          draggable={false}
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{t("app.name")}</span>
          <span className="text-[11px] text-muted-foreground">{t("app.subtitle")}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center px-2 [-webkit-app-region:no-drag]">
        {documentName ? (
          <Badge
            variant="outline"
            title={documentName}
            className="max-w-full gap-2 overflow-hidden px-3 py-1 text-[11px]"
          >
            <FileText className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{documentName}</span>
          </Badge>
        ) : (
          <span className="truncate text-xs text-muted-foreground">
            {t("topbar.noDocument")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 [-webkit-app-region:no-drag]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          aria-label={t("topbar.toggleTheme")}
          title={t("topbar.toggleTheme")}
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
        {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            aria-label={t("topbar.openSettings")}
            title={t("topbar.openSettings")}
          >
            <Settings2 />
          </Button>
        )}
      </div>
    </header>
  );
}
