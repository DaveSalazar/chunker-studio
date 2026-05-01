import { AlertTriangle, FileText } from "lucide-react";
import { DocumentTabs } from "@/components/app/DocumentTabs";
import { DocumentStatsRow } from "@/components/app/DocumentStatsRow";
import { EmptyState } from "@/components/app/EmptyState";
import { WorkspacePanels } from "@/components/app/WorkspacePanels";
import { useT } from "@/lib/i18n";
import type { DuplicateInfo } from "@/lib/duplicateChunks";
import type {
  ChunkerSession,
  DocumentEntry,
  SettingsScope,
} from "@/hooks/useChunkerSession";
import type { ChunkingResult } from "@shared/types";

const EMPTY_DUP_INFO: ReadonlyMap<number, DuplicateInfo> = new Map();
const EMPTY_DUP_INDICES: ReadonlySet<number> = new Set();

export interface DocumentWorkspaceProps {
  documents: DocumentEntry[];
  activeId: string | null;
  activeDoc: DocumentEntry | null;
  /**
   * Active doc's chunking result with duplicate filter applied. Computed in
   * the parent so the ingest dialog and the chunks panel agree on what's
   * "in" — toggling Drop duplicates affects both surfaces in lockstep.
   */
  effectiveResult: ChunkingResult | null;
  scope: SettingsScope;
  overrideCount: number;
  totals: ChunkerSession["totals"];
  /** Per-chunk duplicate group info (over the raw, pre-filter chunks). */
  duplicateInfo?: ReadonlyMap<number, DuplicateInfo>;
  /** Indices of chunks that participate in any duplicate group. */
  duplicateIndices?: ReadonlySet<number>;
  /** ID of the current temp/preview tab (italic) or null. */
  tempId: string | null;

  activeChunkIndex: number | null;
  onChunkClick: (index: number | null) => void;

  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
  /** Promote a temp tab to permanent — called from DocumentTab dblclick. */
  onPromote: (id: string) => void;
  onParse: (id: string) => void;
  onChangeView: ChunkerSession["setDocumentView"];
  onChunkBoundaryChange: ChunkerSession["setChunkBoundary"];
  onResetToAuto: ChunkerSession["resetToAuto"];
  onPdfPageChange: ChunkerSession["setPdfPage"];
  onIngest: () => void;
}

export function DocumentWorkspace({
  documents,
  activeId,
  activeDoc,
  effectiveResult,
  scope,
  overrideCount,
  totals,
  duplicateInfo = EMPTY_DUP_INFO,
  duplicateIndices = EMPTY_DUP_INDICES,
  tempId,
  activeChunkIndex,
  onChunkClick,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onPromote,
  onParse,
  onChangeView,
  onChunkBoundaryChange,
  onResetToAuto,
  onPdfPageChange,
  onIngest,
}: DocumentWorkspaceProps) {
  const t = useT();
  const parsed = activeDoc?.parsed ?? null;
  const error = activeDoc?.error ?? null;

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 overflow-hidden animate-fade-in">
      <DocumentTabs
        documents={documents}
        activeId={activeId}
        tempId={tempId}
        onSelect={onSelectTab}
        onClose={onCloseTab}
        onAdd={onAddTab}
        onPromote={onPromote}
      />

      <DocumentStatsRow
        result={effectiveResult}
        totals={totals}
        scope={scope}
        overrideCount={overrideCount}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {parsed?.warnings.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{t("source.parserNotes")}</span>
          <span className="text-amber-200/80">{parsed.warnings.join(" · ")}</span>
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden">
        {!activeDoc ? (
          <EmptyState
            icon={FileText}
            title={t("chunks.pickDocument")}
            description={t("chunks.pickDocumentDescription")}
          />
        ) : (
          <WorkspacePanels
            documents={documents}
            activeId={activeId}
            effectiveResult={effectiveResult}
            duplicateInfo={duplicateInfo}
            duplicateIndices={duplicateIndices}
            activeChunkIndex={activeChunkIndex}
            onChunkClick={(i) => onChunkClick(i)}
            onParse={onParse}
            onChangeView={onChangeView}
            onChunkBoundaryChange={onChunkBoundaryChange}
            onResetToAuto={onResetToAuto}
            onPdfPageChange={onPdfPageChange}
            onIngest={onIngest}
          />
        )}
      </div>
    </div>
  );
}
