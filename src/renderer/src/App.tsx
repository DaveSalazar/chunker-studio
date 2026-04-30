import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/app/TopBar";
import { Dropzone } from "@/components/app/Dropzone";
import { DocumentWorkspace } from "@/components/app/DocumentWorkspace";
import { Sidebar } from "@/components/app/Sidebar";
import { SettingsDialog } from "@/components/app/SettingsDialog";
import { IngestDialog } from "@/components/app/IngestDialog";
import {
  type ImperativePanelHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ResizeHandle,
} from "@/components/ui/ResizablePanels";
import { useChunkerSession } from "@/hooks/useChunkerSession";
import { countOverrides, useEffectiveResult } from "@/hooks/useEffectiveResult";
import { useTheme } from "@/lib/theme";

export default function App() {
  const session = useChunkerSession();
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);
  const { resolved: themeResolved, toggleLightDark } = useTheme();

  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const [folderCollapsed, setFolderCollapsed] = useState(false);

  // Reset chunk selection whenever the active document changes.
  useEffect(() => {
    setActiveChunkIndex(null);
  }, [session.activeId]);

  const toggleSidebar = () => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  };

  const {
    documents,
    activeId,
    active: activeDoc,
    effectiveSettings,
    hasOverride,
    scope,
    totals,
    folder,
    parsedPaths,
  } = session;

  const file = activeDoc?.file ?? null;
  const { duplicateInfo, duplicateIndices, effectiveResult } = useEffectiveResult(
    activeDoc?.result ?? null,
    effectiveSettings,
  );

  const hasAnyDocs = documents.length > 0;
  const overrideCount = countOverrides(documents);

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar
        documentName={file?.name}
        isDark={themeResolved === "dark"}
        onToggleTheme={toggleLightDark}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={toggleSidebar}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="chunker.shell"
          className="h-full"
        >
          <ResizablePanel
            ref={sidebarPanelRef}
            defaultSize={24}
            // 22% of the 1100px window minimum is ~242px — anything
            // narrower starts squeezing the slider headers and toggle
            // rows. The whole sidebar can still be hidden via the
            // TopBar toggle (collapsedSize: 0).
            minSize={22}
            maxSize={42}
            collapsible
            collapsedSize={0}
            onCollapse={() => setSidebarVisible(false)}
            onExpand={() => setSidebarVisible(true)}
            className="hidden min-w-0 md:block"
          >
            <Sidebar
              effectiveSettings={effectiveSettings}
              scope={scope}
              hasOverride={hasOverride}
              hasAnyDocs={hasAnyDocs}
              activeDocumentName={activeDoc?.file.name}
              onChangeSettings={session.setSettings}
              onChangeScope={session.setScope}
              onClearOverride={session.clearOverride}
              folder={folder}
              parsedPaths={parsedPaths}
              onSelectFolder={session.selectFolder}
              onCloseFolder={session.closeFolder}
              onRefreshFolder={session.refreshFolder}
              onLoadEntry={session.loadEntry}
              onParseAllEntries={session.parseAllEntries}
              settingsCollapsed={settingsCollapsed}
              onToggleSettingsCollapsed={() => setSettingsCollapsed((v) => !v)}
              folderCollapsed={folderCollapsed}
              onToggleFolderCollapsed={() => setFolderCollapsed((v) => !v)}
            />
          </ResizablePanel>

          <ResizeHandle className="hidden md:flex" withHandle />

          <ResizablePanel defaultSize={76} minSize={50} className="min-w-0">
            <section className="flex h-full min-w-0 flex-col overflow-hidden p-6">
              {!hasAnyDocs ? (
                <div className="m-auto w-full max-w-2xl">
                  <Dropzone onPickFile={session.openFiles} />
                </div>
              ) : (
                <DocumentWorkspace
                  documents={documents}
                  activeId={activeId}
                  activeDoc={activeDoc}
                  effectiveResult={effectiveResult}
                  scope={scope}
                  overrideCount={overrideCount}
                  totals={totals}
                  duplicateInfo={duplicateInfo}
                  duplicateIndices={duplicateIndices}
                  tempId={session.tempId}
                  activeChunkIndex={activeChunkIndex}
                  onChunkClick={setActiveChunkIndex}
                  onSelectTab={session.setActive}
                  onCloseTab={session.closeDocument}
                  onAddTab={session.openFiles}
                  onPromote={session.promoteTemp}
                  onParse={session.parseDocument}
                  onChangeView={session.setDocumentView}
                  onChunkBoundaryChange={session.setChunkBoundary}
                  onResetToAuto={session.resetToAuto}
                  onIngest={() => {
                    if (activeId) session.promoteTemp(activeId);
                    setIngestOpen(true);
                  }}
                />
              )}
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <IngestDialog
        open={ingestOpen}
        onOpenChange={setIngestOpen}
        documentName={file?.name ?? null}
        chunks={effectiveResult?.chunks ?? []}
        estimatedTokens={effectiveResult?.totalTokens ?? 0}
        onOpenSettings={() => {
          setIngestOpen(false);
          setSettingsOpen(true);
        }}
      />
    </div>
  );
}
