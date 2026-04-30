export type UnsupportedParseReason = "scanned-pdf";

export interface ParsedDocument {
  text: string;
  pageCount?: number;
  warnings: string[];
  unsupportedReason?: UnsupportedParseReason;
}

export class UnsupportedFormatError extends Error {
  constructor(extension: string) {
    super(`Unsupported file extension: .${extension}`);
    this.name = "UnsupportedFormatError";
  }
}

export class DocumentTooEmptyError extends Error {
  constructor(charCount: number) {
    super(`Extracted text too short (${charCount} chars). Likely a scanned PDF that needs OCR.`);
    this.name = "DocumentTooEmptyError";
  }
}
