import { AlertTriangle, FileText, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/app/EmptyState";
import { ManualEditsBar } from "@/components/app/ManualEditsBar";
import { ParseButton } from "@/components/app/ParseButton";
import { RawDocumentView } from "@/components/app/RawDocumentView";
import { SourcePreview } from "@/components/app/SourcePreview";
import { ViewerTabs } from "@/components/app/ViewerTabs";
import { useT } from "@/lib/i18n";
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
  onChangeView: (view: DocumentView) => void;
  onChunkBoundaryChange: (leftArrayIndex: number, newOffset: number) => void;
  onResetToAuto: () => void;
}

/**
 * Header (title, tab toggle, Parse / manual-edits bar) + body (raw or
 * parsed view). Stateless: every interaction is funnelled through
 * props back to `useChunkerSession`.
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
  onChangeView,
  onChunkBoundaryChange,
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
            <ParseButton loading={loading} onParse={onParse} />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ViewerBody
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
        />
      </CardContent>
    </Card>
  );
}

function ViewerBody({
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
}: {
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
}) {
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
  // Both panes stay mounted; toggling `view` only flips visibility so
  // PDF page + parsed-text scroll all survive a switch.
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
