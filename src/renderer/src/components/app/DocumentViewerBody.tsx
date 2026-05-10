import { AlertTriangle, FileWarning } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { RawDocumentView } from "@/components/app/RawDocumentView";
import { SourcePreview } from "@/components/app/SourcePreview";
import { useT } from "@/lib/i18n";
import type { DocumentView } from "@/hooks/useChunkerSession";
import type { ChunkRecord, OpenedFile, ParsedDocument } from "@shared/types";

export interface DocumentViewerBodyProps {
  file: OpenedFile;
  parsed: ParsedDocument | null;
  chunks: ChunkRecord[];
  normalizedText: string | null;
  view: DocumentView;
  activeChunkIndex: number | null;
  duplicateIndices?: ReadonlySet<number>;
  active: boolean;
  pdfPage?: number;
  onPdfPageChange?: (page: number) => void;
  onChunkClick: (index: number) => void;
  onChunkBoundaryChange: (leftArrayIndex: number, newOffset: number) => void;
  onMarkPlaceholder: (normStart: number, normEnd: number, name: string) => void;
}

/**
 * Switches between the raw-file view and the parsed/chunked view based
 * on `view`. Both panes stay mounted (CSS visibility toggle) so PDF
 * page state and parsed-text scroll position survive a tab switch.
 *
 * Pulled out of DocumentViewer so the orchestrator (header + manual-edits
 * bar + body) stays under the 180-line cap.
 */
export function DocumentViewerBody({
  file,
  parsed,
  chunks,
  normalizedText,
  view,
  activeChunkIndex,
  duplicateIndices,
  active,
  pdfPage,
  onPdfPageChange,
  onChunkClick,
  onChunkBoundaryChange,
  onMarkPlaceholder,
}: DocumentViewerBodyProps) {
  const t = useT();
  if (parsed?.unsupportedReason === "scanned-pdf") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon={FileWarning}
          title={t("viewer.scannedPdfTitle")}
          description={t("viewer.scannedPdfDescription")}
        />
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      <div className={view === "raw" ? "h-full w-full" : "hidden"}>
        <RawDocumentView
          file={file}
          active={active && view === "raw"}
          pdfPage={pdfPage}
          onPdfPageChange={onPdfPageChange}
        />
      </div>
      <div className={view === "parsed" ? "h-full w-full" : "hidden"}>
        {parsed ? (
          <SourcePreview
            text={normalizedText ?? parsed.text}
            chunks={chunks}
            activeChunkIndex={activeChunkIndex}
            duplicateIndices={duplicateIndices}
            onChunkClick={onChunkClick}
            onChunkBoundaryChange={onChunkBoundaryChange}
            onMarkPlaceholder={onMarkPlaceholder}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon={AlertTriangle}
              title={t("viewer.tabParsed")}
              description={t("viewer.parsedNotReady")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
