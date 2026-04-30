import { FileText } from "lucide-react";
import { PdfPreview } from "@/components/app/PdfPreview";
import { TextPreview } from "@/components/app/TextPreview";
import { EmptyState } from "@/components/app/EmptyState";
import { useT } from "@/lib/i18n";
import type { OpenedFile } from "@shared/types";

export interface RawDocumentViewProps {
  file: OpenedFile;
}

/**
 * Picks the right "original" preview for the file's extension. Stateless
 * — purely a dispatcher to per-format components.
 */
export function RawDocumentView({ file }: RawDocumentViewProps) {
  const t = useT();
  const ext = file.extension.toLowerCase();

  if (ext === "pdf") return <PdfPreview filePath={file.path} />;
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
