import type { ChunkRecord, ParsedDocument } from "@shared/types";

/**
 * Estimate which 1-indexed PDF page a chunk lives on.
 *
 * Chunks carry offsets in the *normalized* text; `pageOffsets` lives in
 * the *raw* text (pre-normalize). We map proportionally from one space
 * to the other and binary-search the page table. The normalizer's
 * mutations (dehyphenation, dropped noise lines, whitespace collapse)
 * change length by a small per-page percentage, so the proportional
 * mapping stays accurate within a page or two on long legal-code PDFs.
 *
 * Returns `null` when we can't compute a page (non-PDF source, no
 * `pageOffsets`, or zero-length text).
 */
export function pageForChunk(
  chunk: ChunkRecord,
  parsed: ParsedDocument | null,
  normalizedTextLength: number,
): number | null {
  if (!parsed?.pageOffsets || parsed.pageOffsets.length === 0) return null;
  if (normalizedTextLength === 0 || parsed.text.length === 0) return null;
  const ratio = chunk.startOffset / normalizedTextLength;
  const approxRawOffset = Math.floor(ratio * parsed.text.length);
  return pageForRawOffset(approxRawOffset, parsed.pageOffsets);
}

/**
 * Binary-search `pageOffsets` for the page whose start offset is the
 * largest one ≤ `rawOffset`. Returns 1-indexed page number.
 */
function pageForRawOffset(rawOffset: number, pageOffsets: number[]): number {
  if (pageOffsets.length === 0) return 1;
  let lo = 0;
  let hi = pageOffsets.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (pageOffsets[mid] <= rawOffset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}
