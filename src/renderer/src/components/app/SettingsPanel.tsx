import { ChevronDown, Sliders } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SettingsFields } from "@/components/app/SettingsFields";
import { SettingsScopeBar } from "@/components/app/SettingsScopeBar";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { DEFAULT_CHUNK_SETTINGS, type ChunkSettings } from "@shared/types";
import type { SettingsScope } from "@/hooks/useChunkerSession";

export type { ChunkSettings };
export const DEFAULT_SETTINGS = DEFAULT_CHUNK_SETTINGS;

export interface SettingsPanelProps {
  /** Settings rendered in the form. Required. */
  value: ChunkSettings;
  onChange: (next: ChunkSettings) => void;

  /** When provided, shows the "All docs / This doc" segmented control. */
  scope?: SettingsScope;
  onScopeChange?: (next: SettingsScope) => void;

  /** Active doc name — shown only in perDocument scope, for context. */
  activeDocumentName?: string;

  /** True if the active doc currently has its own override. */
  hasOverride?: boolean;
  /** Reset the active doc back to the global settings. */
  onClearOverride?: () => void;

  /** Disabled when there are 0 documents loaded. */
  disabled?: boolean;

  /** When true, the body is hidden — only the header + chevron remain. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function SettingsPanel({
  value,
  onChange,
  scope,
  onScopeChange,
  activeDocumentName,
  hasOverride,
  onClearOverride,
  disabled,
  collapsed = false,
  onToggleCollapsed,
}: SettingsPanelProps) {
  const t = useT();
  const showScope = scope !== undefined && onScopeChange !== undefined;
  const update = (patch: Partial<ChunkSettings>) => onChange({ ...value, ...patch });

  return (
    // No `h-full` — when the sidebar holds two stacked cards we want them
    // to size by content and let the aside scroll. Forcing 100% here
    // pushed the FolderPanel below the visible area.
    <Card className="flex shrink-0 flex-col">
      <CardHeader className={cn("gap-3", collapsed && "pb-5")}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            {t("settings.title")}
          </CardTitle>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? t("settings.expand") : t("settings.collapse")}
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

        {!collapsed && showScope && (
          <SettingsScopeBar
            scope={scope!}
            onScopeChange={onScopeChange!}
            activeDocumentName={activeDocumentName}
            hasOverride={!!hasOverride}
            onClearOverride={onClearOverride}
          />
        )}

        {!collapsed && !showScope && (
          <p className="text-xs text-muted-foreground">
            {t("settings.fallbackDescription")}
          </p>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="flex flex-col gap-6">
          <SettingsFields value={value} onChange={update} disabled={disabled} />
        </CardContent>
      )}
    </Card>
  );
}
