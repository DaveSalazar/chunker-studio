import { SettingsPanel } from "@/components/app/SettingsPanel";
import { FolderPanel } from "@/components/app/FolderPanel";
import type { ChunkerSession, SettingsScope } from "@/hooks/useChunkerSession";
import type { ChunkSettings } from "@shared/types";

export interface SidebarProps {
  /** Settings to render in the panel (effective for the active doc). */
  effectiveSettings: ChunkSettings;
  scope: SettingsScope;
  hasOverride: boolean;
  hasAnyDocs: boolean;
  activeDocumentName: string | undefined;

  onChangeSettings: (next: ChunkSettings) => void;
  onChangeScope: (next: SettingsScope) => void;
  onClearOverride: () => void;

  folder: ChunkerSession["folder"];
  parsedPaths: ReadonlySet<string>;
  onSelectFolder: () => void;
  onCloseFolder: () => void;
  onRefreshFolder: () => void;
  onLoadEntry: ChunkerSession["loadEntry"];
  onParseAllEntries: () => void;

  settingsCollapsed: boolean;
  onToggleSettingsCollapsed: () => void;
  folderCollapsed: boolean;
  onToggleFolderCollapsed: () => void;
}

export function Sidebar({
  effectiveSettings,
  scope,
  hasOverride,
  hasAnyDocs,
  activeDocumentName,
  onChangeSettings,
  onChangeScope,
  onClearOverride,
  folder,
  parsedPaths,
  onSelectFolder,
  onCloseFolder,
  onRefreshFolder,
  onLoadEntry,
  onParseAllEntries,
  settingsCollapsed,
  onToggleSettingsCollapsed,
  folderCollapsed,
  onToggleFolderCollapsed,
}: SidebarProps) {
  return (
    <aside className="flex h-full min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden border-r border-border bg-card/30 p-4">
      <SettingsPanel
        value={effectiveSettings}
        onChange={onChangeSettings}
        scope={scope}
        onScopeChange={onChangeScope}
        activeDocumentName={activeDocumentName}
        hasOverride={hasOverride}
        onClearOverride={onClearOverride}
        disabled={!hasAnyDocs}
        collapsed={settingsCollapsed}
        onToggleCollapsed={onToggleSettingsCollapsed}
      />

      <FolderPanel
        selection={folder?.selection ?? null}
        entries={folder?.entries ?? []}
        loading={folder?.loading ?? "idle"}
        error={folder?.error ?? null}
        parsedPaths={parsedPaths}
        onSelectFolder={onSelectFolder}
        onCloseFolder={onCloseFolder}
        onRefresh={onRefreshFolder}
        onLoadEntry={onLoadEntry}
        onParseAll={onParseAllEntries}
        collapsed={folderCollapsed}
        onToggleCollapsed={onToggleFolderCollapsed}
      />
    </aside>
  );
}
