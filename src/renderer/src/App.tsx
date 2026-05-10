import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "@/components/app/TopBar";
import { Dropzone } from "@/components/app/Dropzone";
import { DocumentWorkspace } from "@/components/app/DocumentWorkspace";
import { Sidebar } from "@/components/app/Sidebar";
import { SettingsDialog } from "@/components/app/SettingsDialog";
import { IngestDialog } from "@/components/app/IngestDialog";
import { IndexAllDialog } from "@/components/app/IndexAllDialog";
import {
  type ImperativePanelHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ResizeHandle,
} from "@/components/ui/ResizablePanels";
import { useChunkClickWithPdfNav } from "@/hooks/useChunkClickWithPdfNav";
import { useChunkerSession } from "@/hooks/useChunkerSession";
import { countOverrides, useEffectiveResult } from "@/hooks/useEffectiveResult";
import {
  collectDescendantFilePaths,
  type TreeFolder,
} from "@/lib/folderTree";
import { useTheme } from "@/lib/theme";

export default function App() {
  const session = useChunkerSession();
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [indexAllOpen, setIndexAllOpen] = useState(false);
  // Select-to-Index state. Tracks the SET OF UNCHECKED file paths so that
  // the default (empty Set) means "all files selected" — newly-discovered
  // files from a folder refresh are then included automatically without
  // the parent having to re-derive the checked set.
  const [unchecked, setUnchecked] = useState<ReadonlySet<string>>(new Set());
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

  const { documents, activeId, active: activeDoc, effectiveSettings,
    hasOverride, scope, totals, folder, parsedPaths, indexableDocuments } = session;

  const file = activeDoc?.file ?? null;
  const { duplicateInfo, duplicateIndices, effectiveResult } = useEffectiveResult(
    activeDoc?.result ?? null,
    effectiveSettings,
  );

  const hasAnyDocs = documents.length > 0;
  const overrideCount = countOverrides(documents);

  // Filter the indexable list by the user's checkbox selections from the
  // folder tree. Empty unchecked set = no filtering (the default).
  const checkedIndexableDocuments = useMemo(
    () =>
      unchecked.size === 0
        ? indexableDocuments
        : indexableDocuments.filter((d) => !unchecked.has(d.path)),
    [indexableDocuments, unchecked],
  );

  const onToggleFile = useCallback((path: string) => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // Folder click toggles its entire subtree. If everything underneath is
  // currently checked OR the folder is in the indeterminate state, we
  // uncheck all descendants; otherwise we check all of them.
  const onToggleFolder = useCallback(
    (folder: TreeFolder) => {
      const descendants = collectDescendantFilePaths(folder);
      if (descendants.length === 0) return;
      const allChecked = descendants.every((p) => !unchecked.has(p));
      setUnchecked((prev) => {
        const next = new Set(prev);
        if (allChecked) {
          for (const p of descendants) next.add(p);
        } else {
          for (const p of descendants) next.delete(p);
        }
        return next;
      });
    },
    [unchecked],
  );
  const handleChunkClick = useChunkClickWithPdfNav(
    setActiveChunkIndex,
    activeDoc,
    effectiveResult,
    session.setPdfPage,
  );

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
              indexableCount={checkedIndexableDocuments.length}
              onSelectFolder={session.selectFolder}
              onCloseFolder={session.closeFolder}
              onRefreshFolder={session.refreshFolder}
              onLoadEntry={session.loadEntry}
              onParseAllEntries={session.parseAllEntries}
              onReparseAllEntries={session.reparseAllEntries}
              onIndexAll={() => setIndexAllOpen(true)}
              unchecked={unchecked}
              onToggleFile={onToggleFile}
              onToggleFolder={onToggleFolder}
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
                  effectiveSettings={effectiveSettings}
                  scope={scope}
                  overrideCount={overrideCount}
                  totals={totals}
                  duplicateInfo={duplicateInfo}
                  duplicateIndices={duplicateIndices}
                  tempId={session.tempId}
                  activeChunkIndex={activeChunkIndex}
                  onChunkClick={handleChunkClick}
                  onSelectTab={session.setActive}
                  onCloseTab={session.closeDocument}
                  onAddTab={session.openFiles}
                  onPromote={session.promoteTemp}
                  onParse={session.parseDocument}
                  onReparse={session.reparseDocument}
                  onChangeView={session.setDocumentView}
                  onChunkBoundaryChange={session.setChunkBoundary}
                  onMarkPlaceholder={session.markPlaceholder}
                  onResetToAuto={session.resetToAuto}
                  onPdfPageChange={session.setPdfPage}
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

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onAfterClearCache={session.reset}
      />
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
      <IndexAllDialog
        open={indexAllOpen}
        onOpenChange={setIndexAllOpen}
        documents={checkedIndexableDocuments}
        onOpenSettings={() => {
          setIndexAllOpen(false);
          setSettingsOpen(true);
        }}
      />
    </div>
  );
}
