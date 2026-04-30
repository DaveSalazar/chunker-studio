import type { ChunkRecord } from "@shared/types";

export interface ChunkSegment {
  text: string;
  /** Position of this segment's first character in the source text. */
  baseOffset: number;
  /** When non-null, this segment is the body of `chunks[arrayIndex]`. */
  arrayIndex: number | null;
  chunkIndex: number | null;
  active: boolean;
}

/**
 * Walk the chunks once, slicing the source into "in-chunk" and
 * "between-chunks" segments. Chunks that overlap (shouldn't happen, but
 * defensive) are clipped against the running cursor so segments are
 * always contiguous and never duplicated.
 */
export function buildSegments(
  text: string,
  chunks: ChunkRecord[],
  activeIndex: number | null,
): ChunkSegment[] {
  if (text.length === 0) return [];
  if (chunks.length === 0) {
    return [{ text, baseOffset: 0, arrayIndex: null, chunkIndex: null, active: false }];
  }

  // Sort a copy and remember the array index of each entry so boundary
  // edits target the right element in the caller's array.
  const indexed = chunks.map((c, i) => ({ c, i }));
  indexed.sort((a, b) => a.c.startOffset - b.c.startOffset);

  const segments: ChunkSegment[] = [];
  let cursor = 0;
  for (const { c, i } of indexed) {
    const start = Math.max(c.startOffset, cursor);
    const end = Math.min(c.endOffset, text.length);
    if (start > cursor) {
      segments.push({
        text: text.slice(cursor, start),
        baseOffset: cursor,
        arrayIndex: null,
        chunkIndex: null,
        active: false,
      });
    }
    if (end > start) {
      segments.push({
        text: text.slice(start, end),
        baseOffset: start,
        arrayIndex: i,
        chunkIndex: c.index,
        active: c.index === activeIndex,
      });
      cursor = end;
    }
  }
  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      baseOffset: cursor,
      arrayIndex: null,
      chunkIndex: null,
      active: false,
    });
  }
  return segments;
}
