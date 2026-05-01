export type UnsupportedParseReason = "scanned-pdf";

export interface ParsedDocument {
  text: string;
  pageCount?: number;
  /**
   * `pageOffsets[i]` is the char offset in `text` where page `i+1`
   * starts. Empty for non-PDF formats. Drives chunk → PDF page jumps
   * in the renderer.
   */
  pageOffsets?: number[];
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
