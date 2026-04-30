import { inject, injectable } from "inversify";
import type { DocumentParser } from "../domain/DocumentParser";
import type { ParsedDocument } from "../domain/ParsingEntities";
import { FileSystemLocator } from "../../filesystem/domain/FileSystemLocator";
import type { FileSystemRepository } from "../../filesystem/domain/FileSystemRepository";

@injectable()
export class TextDocumentParser implements DocumentParser {
  readonly extensions = ["txt", "md"] as const;

  constructor(
    @inject(FileSystemLocator.FileSystemRepository)
    private readonly fs: FileSystemRepository,
  ) {}

  async parse(filePath: string): Promise<ParsedDocument> {
    const text = await this.fs.readUtf8(filePath);
    return { text, warnings: [] };
  }
}
