export type ChunkingStrategyId = "articleAware" | "paragraph" | "wholeDocument";

export interface ChunkSettings {
  maxChunkTokens: number;
  minChunkChars: number;
  headingLookback: number;
  /** percentage 0–100; chunks below this letter-to-total ratio are dropped */
  letterRatio: number;
  dehyphenate: boolean;
  splitByArticle: boolean;
  /** Top-level strategy. Dispatched to a Chunker impl by CompositeChunker. */
  chunkingStrategy: ChunkingStrategyId;
  /** Pre-pass that rewrites in-template blanks into <<PLACEHOLDER>> form. */
  normalizePlaceholders: boolean;
}

export interface RawChunk {
  text: string;
  /**
   * Verbatim source text. Populated by the wholeDocument strategy so the
   * downstream LLM can use the full document as a generation scaffold.
   * Null for article/paragraph strategies — the embedded text already
   * carries the displayable content.
   */
  body: string | null;
  article: string | null;
  heading: string | null;
  startOffset: number;
  endOffset: number;
}

export interface ScoredChunk extends RawChunk {
  index: number;
  charCount: number;
  tokenCount: number;
}

export type ChunkingStrategy = "article" | "paragraph" | "wholeDocument";

export interface ChunkingOutcome {
  chunks: ScoredChunk[];
  normalizedText: string;
  strategy: ChunkingStrategy;
  totalTokens: number;
  totalChars: number;
}
