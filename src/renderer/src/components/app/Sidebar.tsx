import { SettingsPanel } from "@/components/app/SettingsPanel";
import { FolderPanel } from "@/components/app/FolderPanel";
import type { ChunkerSession, SettingsScope } from "@/hooks/useChunkerSession";
import type { TreeFolder } from "@/lib/folderTree";
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
  indexableCount: number;
  onSelectFolder: () => void;
  onCloseFolder: () => void;
  onRefreshFolder: () => void;
  onLoadEntry: ChunkerSession["loadEntry"];
  onParseAllEntries: () => void;
  onReparseAllEntries: () => void;
  onIndexAll: () => void;

  /** Select-to-Index state. `unchecked` = file paths the user excluded. */
  unchecked: ReadonlySet<string>;
  onToggleFile: (path: string) => void;
  onToggleFolder: (folder: TreeFolder) => void;

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
  indexableCount,
  onSelectFolder,
  onCloseFolder,
  onRefreshFolder,
  onLoadEntry,
  onParseAllEntries,
  onReparseAllEntries,
  onIndexAll,
  unchecked,
  onToggleFile,
  onToggleFolder,
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
        indexableCount={indexableCount}
        onSelectFolder={onSelectFolder}
        onCloseFolder={onCloseFolder}
        onRefresh={onRefreshFolder}
        onLoadEntry={onLoadEntry}
        onParseAll={onParseAllEntries}
        onReparseAll={onReparseAllEntries}
        onIndexAll={onIndexAll}
        unchecked={unchecked}
        onToggleFile={onToggleFile}
        onToggleFolder={onToggleFolder}
        collapsed={folderCollapsed}
        onToggleCollapsed={onToggleFolderCollapsed}
      />
    </aside>
  );
}
