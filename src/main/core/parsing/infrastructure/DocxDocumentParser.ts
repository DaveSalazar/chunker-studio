import { inject, injectable } from "inversify";
import mammoth from "mammoth";
import type { DocumentParser } from "../domain/DocumentParser";
import type { ParsedDocument } from "../domain/ParsingEntities";
import { FileSystemLocator } from "../../filesystem/domain/FileSystemLocator";
import type { FileSystemRepository } from "../../filesystem/domain/FileSystemRepository";

@injectable()
export class DocxDocumentParser implements DocumentParser {
  // `.doc` (legacy binary OLE2) is not handled — mammoth only supports
  // the Open XML `.docx` format. Folder-walking already filters `.doc`
  // out of SUPPORTED_EXTENSIONS so we don't see them through the
  // registry; this list keeps the parser honest about what it owns.
  readonly extensions = ["docx"] as const;

  constructor(
    @inject(FileSystemLocator.FileSystemRepository)
    private readonly fs: FileSystemRepository,
  ) {}

  async parse(filePath: string): Promise<ParsedDocument> {
    // mammoth's extractRawText accepts a Buffer / ArrayBuffer; we hand it the
    // bytes from disk rather than letting it open the file itself, so the
    // FS adapter remains the single source of file I/O.
    const bytes = await this.fs.readBytes(filePath);
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    });
    const warnings = result.messages
      .filter((m) => m.type === "warning" || m.type === "error")
      .map((m) => `${m.type}: ${m.message}`);
    return { text: result.value, warnings };
  }
}
