// Parsing + chunking + manual-edit IPC contracts.

export type UnsupportedParseReason = "scanned-pdf";

export interface ParsedDocument {
  path: string;
  name: string;
  extension: string;
  text: string;
  pageCount?: number;
  /**
   * `pageOffsets[i]` is the char offset in `text` where page `i+1`
   * starts. Populated for PDFs; empty for DOCX / TXT / MD. Lets the
   * renderer jump the PDF preview to the page a chunk lives on.
   */
  pageOffsets?: number[];
  warnings: string[];
  /**
   * Set when parsing technically succeeded but the document can't be
   * processed further — e.g. a scanned PDF with no extractable text
   * layer. The renderer renders a "format not supported" state instead
   * of running the chunking pipeline on empty text.
   */
  unsupportedReason?: UnsupportedParseReason;
}

/**
 * Top-level chunking strategy.
 *
 *   "articleAware"  — detect Art. N markers; fall back to paragraph
 *                     grouping when fewer than three are found.
 *   "wholeDocument" — emit exactly one chunk per file; embedded text is
 *                     a synthesized intent surface (first ~1500 chars),
 *                     full text travels in the body field for downstream
 *                     verbatim use (template generation).
 *   "paragraph"     — deprecated alias for "articleAware". Kept here so
 *                     pre-migration profiles on disk still validate.
 */
export type ChunkingStrategyId = "articleAware" | "paragraph" | "wholeDocument";

export interface ChunkSettings {
  maxChunkTokens: number;
  minChunkChars: number;
  headingLookback: number;
  letterRatio: number;
  dehyphenate: boolean;
  splitByArticle: boolean;
  /**
   * Top-level chunking strategy. The dispatcher routes "wholeDocument"
   * to the single-chunk-per-file path; everything else routes to the
   * article-aware path (which itself decides article vs paragraph based
   * on splitByArticle + how many Art. N markers it finds).
   */
  chunkingStrategy: ChunkingStrategyId;
  /**
   * When true, a placeholder pre-pass rewrites in-template blanks
   * (`___`, `NOMBRE: ___`, `fecha __ de __ de 20__`) into the
   * `<<NOMBRE>>` / `<<FECHA>>` form the chat backend's system prompt
   * already knows how to surface. Only applied for the wholeDocument
   * strategy — codes have no blanks.
   */
  normalizePlaceholders: boolean;
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
  chunkingStrategy: "articleAware",
  normalizePlaceholders: false,
  duplicateMinChars: 60,
  dropDuplicates: false,
};

export interface ChunkRecord {
  index: number;
  article: string | null;
  heading: string | null;
  text: string;
  /**
   * Full document text for the wholeDocument strategy; null otherwise.
   * `text` carries the embedded intent surface; `body` carries the
   * verbatim payload that downstream consumers (template generation in
   * the backend) hand to the LLM as scaffold.
   */
  body: string | null;
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
  strategy: "article" | "paragraph" | "wholeDocument";
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

/**
 * mammoth.convertToHtml output for the original-file viewer's .docx
 * preview pane. The HTML is sanitized in the renderer (see
 * sanitizeDocxHtml) before being handed to React. `warnings` mirrors
 * the messages mammoth emits — most are about styles it couldn't
 * preserve, which is fine for a preview but useful for debugging.
 */
export interface DocxHtmlPreview {
  html: string;
  warnings: string[];
}
