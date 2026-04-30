import { useEffect, useRef } from "react";
import { ChunksPanel } from "@/components/app/ChunksPanel";
import { DocumentViewer } from "@/components/app/DocumentViewer";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizeHandle,
} from "@/components/ui/ResizablePanels";
import { cn } from "@/lib/cn";
import type { DuplicateInfo } from "@/lib/duplicateChunks";
import type {
  ChunkerSession,
  DocumentEntry,
} from "@/hooks/useChunkerSession";
import type { ChunkingResult } from "@shared/types";

export interface WorkspacePanelsProps {
  documents: DocumentEntry[];
  activeId: string | null;
  /** Active doc's chunking result with duplicate filter applied. */
  effectiveResult: ChunkingResult | null;
  duplicateInfo: ReadonlyMap<number, DuplicateInfo>;
  duplicateIndices: ReadonlySet<number>;
  activeChunkIndex: number | null;
  onChunkClick: (index: number) => void;
  onParse: (id: string) => void;
  onChangeView: ChunkerSession["setDocumentView"];
  onChunkBoundaryChange: ChunkerSession["setChunkBoundary"];
  onResetToAuto: ChunkerSession["resetToAuto"];
  onIngest: () => void;
}

/**
 * Renders one DocumentViewer + ChunksPanel slot per opened tab,
 * lazy-mounted on first activation and hidden via CSS afterwards.
 *
 * Why: the PDF iframe inside RawDocumentView is *very* expensive to
 * unmount/remount — each tab switch forced Chromium to re-fetch bytes,
 * recreate a blob URL, and reset the PDF plugin to page 1. Rapidly
 * switching between large PDFs also triggered GPU mailbox exhaustion
 * ("ProduceSkia: non-existent mailbox" → renderer hang). Keeping the
 * iframe alive across tab switches makes switching instant and avoids
 * the GPU churn entirely.
 */
export function WorkspacePanels(props: WorkspacePanelsProps) {
  const { documents, activeId } = props;
  const mountedIdsRef = useRef<Set<string>>(new Set());
  if (activeId) mountedIdsRef.current.add(activeId);

  useEffect(() => {
    const live = new Set(documents.map((d) => d.id));
    for (const id of [...mountedIdsRef.current]) {
      if (!live.has(id)) mountedIdsRef.current.delete(id);
    }
  }, [documents]);

  const mountedDocs = documents.filter((d) =>
    mountedIdsRef.current.has(d.id),
  );

  return (
    <ResizablePanelGroup
      direction="horizontal"
      autoSaveId="chunker.workspace"
      className="h-full"
    >
      <ResizablePanel defaultSize={55} minSize={25} className="min-w-0">
        <div className="relative h-full min-w-0 overflow-hidden pr-2">
          {mountedDocs.map((doc) => (
            <ViewerSlot
              key={doc.id}
              doc={doc}
              isActive={doc.id === activeId}
              {...props}
            />
          ))}
        </div>
      </ResizablePanel>

      <ResizeHandle withHandle />

      <ResizablePanel defaultSize={45} minSize={25} className="min-w-0">
        <div className="relative h-full">
          {mountedDocs.map((doc) => (
            <ChunksSlot
              key={doc.id}
              doc={doc}
              isActive={doc.id === activeId}
              {...props}
            />
          ))}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

interface SlotBaseProps extends WorkspacePanelsProps {
  doc: DocumentEntry;
  isActive: boolean;
}

function ViewerSlot({
  doc,
  isActive,
  effectiveResult,
  activeChunkIndex,
  duplicateIndices,
  onChunkClick,
  onParse,
  onChangeView,
  onChunkBoundaryChange,
  onResetToAuto,
}: SlotBaseProps) {
  const result = isActive ? effectiveResult : doc.result;
  return (
    <div className={cn("absolute inset-0", !isActive && "hidden")}>
      <DocumentViewer
        file={doc.file}
        parsed={doc.parsed}
        chunks={result?.chunks ?? []}
        normalizedText={result?.normalizedText ?? null}
        loading={doc.loading}
        view={doc.view}
        activeChunkIndex={isActive ? activeChunkIndex : null}
        duplicateIndices={isActive ? duplicateIndices : undefined}
        manualMode={doc.manualMode}
        onChunkClick={(i) => onChunkClick(i)}
        onParse={() => onParse(doc.id)}
        onChangeView={(v) => onChangeView(doc.id, v)}
        onChunkBoundaryChange={(leftIdx, offset) =>
          onChunkBoundaryChange(doc.id, leftIdx, offset)
        }
        onResetToAuto={() => onResetToAuto(doc.id)}
      />
    </div>
  );
}

function ChunksSlot({
  doc,
  isActive,
  effectiveResult,
  duplicateInfo,
  activeChunkIndex,
  onChunkClick,
  onIngest,
}: SlotBaseProps) {
  return (
    <div className={cn("absolute inset-0 pl-2", !isActive && "hidden")}>
      <ChunksPanel
        result={isActive ? effectiveResult : doc.result}
        loading={doc.loading}
        activeChunkIndex={isActive ? activeChunkIndex : null}
        duplicateInfo={isActive ? duplicateInfo : undefined}
        onChunkClick={(i) => onChunkClick(i)}
        onIngest={onIngest}
      />
    </div>
  );
}
