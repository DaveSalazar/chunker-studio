import { inject, injectable } from "inversify";
import { ChunkingLocator } from "../domain/ChunkingLocator";
import type { Chunker } from "../domain/Chunker";
import type { TextNormalizer } from "../domain/TextNormalizer";
import type { PlaceholderNormalizer } from "../domain/PlaceholderNormalizer";
import type { TokenCounter } from "../domain/TokenCounter";
import type {
  ChunkingOutcome,
  ChunkSettings,
  RawChunk,
} from "../domain/ChunkingEntities";
import { scoreChunks } from "./chunkFinalize";

/**
 * Treats the whole input as one retrievable unit. Used for document
 * templates (minutas, demandas, contratos) where the LLM downstream
 * needs the verbatim body to fill in placeholders, and chunk-level
 * retrieval would dilute the signal that maps "crea una minuta
 * aclaratoria" → the right template.
 *
 *   normalize → optional placeholder rewrite
 *     text  = first INTENT_SURFACE_CHARS chars (what gets embedded)
 *     body  = full normalized text (what the backend hands to the LLM)
 *
 * Templates open with their natural heading ("MINUTA ACLARATORIA Y
 * RECTIFICATORIA\n\nEn la ciudad..."), so the head of the body is a
 * strong intent surface for similarity search.
 */
@injectable()
export class WholeDocumentChunker implements Chunker {
  /**
   * Cap on what gets embedded. Chosen so the typical short minuta
   * (~1500–4000 chars) embeds its heading + opening clauses, and long
   * demandas (~10k+) don't dilute the signal across boilerplate further
   * down. The full body still rides along in the body field for
   * downstream verbatim use.
   */
  private static readonly INTENT_SURFACE_CHARS = 1500;

  constructor(
    @inject(ChunkingLocator.TextNormalizer)
    private readonly normalizer: TextNormalizer,
    @inject(ChunkingLocator.PlaceholderNormalizer)
    private readonly placeholders: PlaceholderNormalizer,
    @inject(ChunkingLocator.TokenCounter)
    private readonly tokens: TokenCounter,
  ) {}

  chunk(rawText: string, settings: ChunkSettings): ChunkingOutcome {
    let body = this.normalizer.normalize(rawText, {
      dehyphenate: settings.dehyphenate,
    });
    if (settings.normalizePlaceholders) {
      body = this.placeholders.normalize(body);
    }

    const intentSurface = body.slice(
      0,
      WholeDocumentChunker.INTENT_SURFACE_CHARS,
    );

    // Empty / whitespace-only bodies produce zero chunks so the ingest
    // path can refuse them with the same "no valid chunks" UX it uses
    // for codes that yield nothing after filtering.
    if (body.length === 0) {
      return {
        chunks: [],
        normalizedText: body,
        strategy: "wholeDocument",
        totalTokens: 0,
        totalChars: 0,
      };
    }

    const raw: RawChunk = {
      text: intentSurface,
      body,
      article: null,
      heading: null,
      startOffset: 0,
      endOffset: body.length,
    };
    const scored = scoreChunks([raw], this.tokens);

    return {
      chunks: scored,
      normalizedText: body,
      strategy: "wholeDocument",
      totalTokens: scored[0]?.tokenCount ?? 0,
      totalChars: body.length,
    };
  }
}
