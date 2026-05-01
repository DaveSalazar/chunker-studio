import { inject, injectable } from "inversify";
import type { DocumentParser } from "../domain/DocumentParser";
import type { ParsedDocument } from "../domain/ParsingEntities";
import { FileSystemLocator } from "../../filesystem/domain/FileSystemLocator";
import type { FileSystemRepository } from "../../filesystem/domain/FileSystemRepository";

// pdfjs-dist 4.x ships a Node-friendly legacy build; we lazy-import to avoid
// pulling its DOMMatrix shim into modules that don't need it.
type GetTextContentItem = { str: string; hasEOL?: boolean };

@injectable()
export class PdfDocumentParser implements DocumentParser {
  readonly extensions = ["pdf"] as const;

  constructor(
    @inject(FileSystemLocator.FileSystemRepository)
    private readonly fs: FileSystemRepository,
  ) {}

  async parse(filePath: string): Promise<ParsedDocument> {
    const bytes = await this.fs.readBytes(filePath);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const loadingTask = pdfjs.getDocument({
      data: bytes,
      // disable worker — main process already runs in its own thread.
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;

    const pages: string[] = [];
    const pageOffsets: number[] = [];
    const warnings: string[] = [];
    let cursor = 0;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items = content.items as GetTextContentItem[];
      const lines: string[] = [];
      let buffer = "";
      for (const item of items) {
        buffer += item.str;
        if (item.hasEOL) {
          lines.push(buffer);
          buffer = "";
        } else {
          buffer += " ";
        }
      }
      if (buffer.trim().length > 0) lines.push(buffer);
      const pageText = lines.join("\n");
      pageOffsets.push(cursor);
      pages.push(pageText);
      cursor += pageText.length;
      if (i < doc.numPages) cursor += 2;  // for the "\n\n" join separator
    }

    const text = pages.join("\n\n");
    if (text.trim().length === 0) {
      warnings.push("Extracted no text — likely a scanned PDF that requires OCR.");
    }
    return { text, pageCount: doc.numPages, pageOffsets, warnings };
  }
}
