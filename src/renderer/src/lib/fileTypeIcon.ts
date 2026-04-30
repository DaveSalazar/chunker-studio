import {
  File as FileBlank,
  FileCode2,
  FileText,
  FileType2,
  type LucideIcon,
} from "lucide-react";

export interface FileTypeInfo {
  Icon: LucideIcon;
  /** Tailwind text-color class for the icon. */
  iconColor: string;
}

/**
 * Visual identity for the file types the chunker understands. Distinct
 * lucide icons + accent colors so PDFs, Word docs, Markdown, and plain
 * text are visually separable in dense lists (folder tree, tab strip).
 */
const MAP: Record<string, FileTypeInfo> = {
  pdf: { Icon: FileType2, iconColor: "text-rose-400" },
  docx: { Icon: FileText, iconColor: "text-sky-400" },
  doc: { Icon: FileText, iconColor: "text-sky-400" },
  txt: { Icon: FileBlank, iconColor: "text-zinc-400" },
  md: { Icon: FileCode2, iconColor: "text-violet-400" },
};

const DEFAULT: FileTypeInfo = {
  Icon: FileBlank,
  iconColor: "text-muted-foreground",
};

export function fileTypeIcon(extension: string | undefined | null): FileTypeInfo {
  if (!extension) return DEFAULT;
  return MAP[extension.toLowerCase()] ?? DEFAULT;
}
