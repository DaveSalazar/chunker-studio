import { FileText } from "lucide-react";
import { PdfPreview } from "@/components/app/PdfPreview";
import { TextPreview } from "@/components/app/TextPreview";
import { EmptyState } from "@/components/app/EmptyState";
import { useT } from "@/lib/i18n";
import type { OpenedFile } from "@shared/types";

export interface RawDocumentViewProps {
  file: OpenedFile;
  /**
   * Forwarded to PdfPreview so hidden tabs skip the canvas paint. Other
   * format previews are cheap enough to render unconditionally.
   */
  active?: boolean;
  /** Controlled PDF page (forwarded to PdfPreview). */
  pdfPage?: number;
  onPdfPageChange?: (page: number) => void;
}

/**
 * Picks the right "original" preview for the file's extension. Stateless
 * — purely a dispatcher to per-format components.
 */
export function RawDocumentView({
  file,
  active = true,
  pdfPage,
  onPdfPageChange,
}: RawDocumentViewProps) {
  const t = useT();
  const ext = file.extension.toLowerCase();

  if (ext === "pdf")
    return (
      <PdfPreview
        filePath={file.path}
        active={active}
        pageNum={pdfPage}
        onPageChange={onPdfPageChange}
      />
    );
  if (ext === "txt" || ext === "md") return <TextPreview filePath={file.path} />;

  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={FileText}
        title={file.name}
        description={
          ext === "docx" || ext === "doc"
            ? t("viewer.docxNoPreview")
            : t("viewer.unsupportedNoPreview")
        }
      />
    </div>
  );
}
