import type { ParsedDocument } from "./ParsingEntities";

/**
 * A parser owns the extraction strategy for one or more file extensions.
 * Implementations live in `infrastructure/`.
 */
export interface DocumentParser {
  readonly extensions: readonly string[];
  parse(filePath: string): Promise<ParsedDocument>;
}

export interface DocumentParserRegistry {
  resolve(extension: string): DocumentParser | null;
}
