import { inject, injectable, multiInject } from "inversify";
import type { DocumentParser, DocumentParserRegistry } from "../domain/DocumentParser";
import { ParsingLocator } from "../domain/ParsingLocator";

export const ParserToken = Symbol.for("DocumentParser");

@injectable()
export class InMemoryDocumentParserRegistry implements DocumentParserRegistry {
  private readonly byExtension: Map<string, DocumentParser>;

  constructor(@multiInject(ParserToken) parsers: DocumentParser[]) {
    this.byExtension = new Map();
    for (const parser of parsers) {
      for (const ext of parser.extensions) {
        this.byExtension.set(ext.toLowerCase(), parser);
      }
    }
  }

  resolve(extension: string): DocumentParser | null {
    return this.byExtension.get(extension.toLowerCase()) ?? null;
  }
}

// Re-export the locator symbol so wiring imports from one place.
export { ParsingLocator };

// `inject` is re-exported so this file declares its full dep-injection contract.
// (Useful for IDE go-to-definition flow.)
export { inject };
