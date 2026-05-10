import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DocumentViewerBody } from "@/components/app/DocumentViewerBody";
import { ManualEditsBar } from "@/components/app/ManualEditsBar";
import { ParseButton } from "@/components/app/ParseButton";
import { ViewerTabs } from "@/components/app/ViewerTabs";
import type { DocumentLoading, DocumentView } from "@/hooks/useChunkerSession";
import type { ChunkRecord, OpenedFile, ParsedDocument } from "@shared/types";

export interface DocumentViewerProps {
  file: OpenedFile;
  parsed: ParsedDocument | null;
  chunks: ChunkRecord[];
  normalizedText: string | null;
  loading: DocumentLoading;
  view: DocumentView;
  activeChunkIndex: number | null;
  duplicateIndices?: ReadonlySet<number>;
  manualMode: boolean;
  /** True when this viewer's slot is the visible tab; gates PDF GPU paint. */
  active?: boolean;
  /** Controlled PDF page (1-indexed). Per-doc in session state. */
  pdfPage?: number;
  onPdfPageChange?: (page: number) => void;
  onChunkClick: (index: number) => void;
  onParse: () => void;
  onReparse: () => void;
  onChangeView: (view: DocumentView) => void;
  onChunkBoundaryChange: (leftArrayIndex: number, newOffset: number) => void;
  onMarkPlaceholder: (normStart: number, normEnd: number, name: string) => void;
  onResetToAuto: () => void;
}

/**
 * Header (title, tab toggle, Parse / manual-edits bar) + body (raw or
 * parsed view). Stateless: every interaction is funnelled through
 * props back to `useChunkerSession`. The body itself lives in
 * DocumentViewerBody so this orchestrator stays small.
 */
export function DocumentViewer({
  file,
  parsed,
  chunks,
  normalizedText,
  loading,
  view,
  activeChunkIndex,
  duplicateIndices,
  manualMode,
  active = true,
  pdfPage,
  onPdfPageChange,
  onChunkClick,
  onParse,
  onReparse,
  onChangeView,
  onChunkBoundaryChange,
  onMarkPlaceholder,
  onResetToAuto,
}: DocumentViewerProps) {
  const isUnsupported = parsed?.unsupportedReason !== undefined;
  const parsedReady = loading === "ready" && parsed !== null && !isUnsupported;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="truncate" title={file.path}>
            {file.name}
          </span>
        </CardTitle>
        <div className="flex shrink-0 items-center gap-2">
          <ViewerTabs
            view={view}
            parsedEnabled={parsedReady}
            onChangeView={onChangeView}
          />
          {isUnsupported ? null : manualMode ? (
            <ManualEditsBar onResetToAuto={onResetToAuto} />
          ) : (
            <ParseButton
              loading={loading}
              onParse={onParse}
              onReparse={onReparse}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <DocumentViewerBody
          file={file}
          parsed={parsed}
          chunks={chunks}
          normalizedText={normalizedText}
          view={view}
          activeChunkIndex={activeChunkIndex}
          duplicateIndices={duplicateIndices}
          active={active}
          pdfPage={pdfPage}
          onPdfPageChange={onPdfPageChange}
          onChunkClick={onChunkClick}
          onChunkBoundaryChange={onChunkBoundaryChange}
          onMarkPlaceholder={onMarkPlaceholder}
        />
      </CardContent>
    </Card>
  );
}
