export interface ChunkSettings {
  maxChunkTokens: number;
  minChunkChars: number;
  headingLookback: number;
  /** percentage 0–100; chunks below this letter-to-total ratio are dropped */
  letterRatio: number;
  dehyphenate: boolean;
  splitByArticle: boolean;
}

export interface RawChunk {
  text: string;
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

export type ChunkingStrategy = "article" | "paragraph";

export interface ChunkingOutcome {
  chunks: ScoredChunk[];
  normalizedText: string;
  strategy: ChunkingStrategy;
  totalTokens: number;
  totalChars: number;
}
