import { inject, injectable } from "inversify";
import { ChunkingLocator } from "../domain/ChunkingLocator";
import type { Chunker } from "../domain/Chunker";
import type { TextNormalizer } from "../domain/TextNormalizer";
import type { TokenCounter } from "../domain/TokenCounter";
import type {
  ChunkingOutcome,
  ChunkingStrategy,
  ChunkSettings,
  RawChunk,
} from "../domain/ChunkingEntities";
import { findArticles, splitByArticles } from "./articleSplitter";
import { chunkByParagraphs } from "./paragraphSplitter";
import { isUseful, scoreChunks } from "./chunkFinalize";

/**
 * Article-aware chunking strategy for documents structured by `Art. N` markers.
 *
 *   normalize → detect Art. N markers
 *     ≥ 3 markers AND splitByArticle  → article-aware split (with heading lookback)
 *     otherwise                       → paragraph fallback
 *   apply quality filters
 *   score each chunk with the token counter
 *
 * The split-strategy work lives in `articleSplitter.ts` /
 * `paragraphSplitter.ts`; finalization (filter + score) in
 * `chunkFinalize.ts`. This class is intentionally just the wiring.
 *
 * Settings are passed in per call so the renderer can re-chunk live as
 * the operator drags sliders.
 */
@injectable()
export class ArticleAwareChunker implements Chunker {
  constructor(
    @inject(ChunkingLocator.TextNormalizer)
    private readonly normalizer: TextNormalizer,
    @inject(ChunkingLocator.TokenCounter)
    private readonly tokens: TokenCounter,
  ) {}

  chunk(rawText: string, settings: ChunkSettings): ChunkingOutcome {
    const normalized = this.normalizer.normalize(rawText, {
      dehyphenate: settings.dehyphenate,
    });

    const matches = settings.splitByArticle ? findArticles(normalized) : [];
    let raw: RawChunk[];
    let strategy: ChunkingStrategy;
    if (matches.length >= 3) {
      raw = splitByArticles(normalized, matches, settings);
      strategy = "article";
    } else {
      raw = chunkByParagraphs(normalized, settings);
      strategy = "paragraph";
    }

    const filtered = raw.filter((c) => isUseful(c, settings));
    const scored = scoreChunks(filtered, this.tokens);

    return {
      chunks: scored,
      normalizedText: normalized,
      strategy,
      totalTokens: scored.reduce((acc, c) => acc + c.tokenCount, 0),
      totalChars: scored.reduce((acc, c) => acc + c.charCount, 0),
    };
  }
}
