// Parsing + chunking + manual-edit IPC contracts.

export type UnsupportedParseReason = "scanned-pdf";

export interface ParsedDocument {
  path: string;
  name: string;
  extension: string;
  text: string;
  pageCount?: number;
  warnings: string[];
  /**
   * Set when parsing technically succeeded but the document can't be
   * processed further — e.g. a scanned PDF with no extractable text
   * layer. The renderer renders a "format not supported" state instead
   * of running the chunking pipeline on empty text.
   */
  unsupportedReason?: UnsupportedParseReason;
}

export interface ChunkSettings {
  maxChunkTokens: number;
  minChunkChars: number;
  headingLookback: number;
  letterRatio: number;
  dehyphenate: boolean;
  splitByArticle: boolean;
  /**
   * Minimum normalized-text length (in chars) for the renderer to flag
   * a chunk as a duplicate of another. 0 disables duplicate highlighting.
   * View-only — does not affect the chunker's output and is excluded from
   * the cache key.
   */
  duplicateMinChars: number;
  /**
   * When true (and `duplicateMinChars > 0`), the renderer keeps only the
   * first occurrence of each duplicate group — both in the chunks panel
   * and in the ingest payload. Post-filter; doesn't change the chunker
   * output or invalidate the cache.
   */
  dropDuplicates: boolean;
}

export const DEFAULT_CHUNK_SETTINGS: ChunkSettings = {
  maxChunkTokens: 500,
  minChunkChars: 80,
  headingLookback: 600,
  letterRatio: 40,
  dehyphenate: true,
  splitByArticle: true,
  duplicateMinChars: 60,
  dropDuplicates: false,
};

export interface ChunkRecord {
  index: number;
  article: string | null;
  heading: string | null;
  text: string;
  charCount: number;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
}

export interface ChunkCacheKey {
  textHash: string;
  settingsHash: string;
}

export interface ChunkingResult {
  chunks: ChunkRecord[];
  totalTokens: number;
  totalChars: number;
  strategy: "article" | "paragraph";
  normalizedText: string;
  estimatedCostUsd: number;
  /**
   * Identifies the (text, settings) pair behind this run in the session
   * cache. The renderer passes it back when persisting manual edits.
   * Absent on direct test/storybook constructions.
   */
  cacheKey?: ChunkCacheKey;
}

export interface ManualBoundaryEditRequest {
  cacheKey: ChunkCacheKey;
  leftIndex: number;
  left: ChunkRecord;
  right: ChunkRecord;
}
