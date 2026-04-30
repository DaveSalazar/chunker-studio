import type { RawChunk, ScoredChunk, ChunkSettings } from "../domain/ChunkingEntities";
import type { TokenCounter } from "../domain/TokenCounter";
import { HEADING_PATTERN } from "./articleSplitter";

/**
 * Reject chunks that won't carry retrieval signal — too short, just a
 * heading line, or mostly numbers/punctuation. Keeps OCR tables and
 * page-break debris out of the embedding budget.
 */
export function isUseful(chunk: RawChunk, settings: ChunkSettings): boolean {
  const text = chunk.text.trim();
  if (text.length < settings.minChunkChars) return false;
  if (text.split("\n").length <= 1 && HEADING_PATTERN.test(text)) return false;

  let letters = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\p{L}/u.test(ch)) letters++;
  }
  const ratio = (letters / Math.max(text.length, 1)) * 100;
  return ratio >= settings.letterRatio;
}

/** Index, char-count, and token-count every survivor. */
export function scoreChunks(
  chunks: RawChunk[],
  tokens: TokenCounter,
): ScoredChunk[] {
  if (chunks.length === 0) return [];
  const counts = tokens.countBatch(chunks.map((c) => c.text));
  return chunks.map((c, i) => ({
    ...c,
    index: i + 1,
    charCount: c.text.length,
    tokenCount: counts[i] ?? 0,
  }));
}
