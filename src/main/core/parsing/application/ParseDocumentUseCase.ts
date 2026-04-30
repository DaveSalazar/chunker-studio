import { inject, injectable } from "inversify";
import { ParsingLocator } from "../domain/ParsingLocator";
import type { DocumentParserRegistry } from "../domain/DocumentParser";
import { UnsupportedFormatError, type ParsedDocument } from "../domain/ParsingEntities";
import { FileSystemLocator } from "../../filesystem/domain/FileSystemLocator";
import { StatFileUseCase } from "../../filesystem/application/StatFileUseCase";
import type { FileMetadata } from "../../filesystem/domain/FileSystemEntities";

export interface ParseDocumentResult {
  metadata: FileMetadata;
  document: ParsedDocument;
}

@injectable()
export class ParseDocumentUseCase {
  constructor(
    @inject(ParsingLocator.DocumentParserRegistry)
    private readonly registry: DocumentParserRegistry,
    @inject(FileSystemLocator.StatFileUseCase)
    private readonly stat: StatFileUseCase,
  ) {}

  async execute(path: string): Promise<ParseDocumentResult> {
    const metadata = await this.stat.execute(path);
    const parser = this.registry.resolve(metadata.extension);
    if (!parser) throw new UnsupportedFormatError(metadata.extension);
    const document = await parser.parse(path);
    return { metadata, document };
  }
}
