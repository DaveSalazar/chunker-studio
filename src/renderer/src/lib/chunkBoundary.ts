/**
 * Helpers for the manual-chunk-boundary drag interaction.
 *
 * Kept stateless and DOM-aware so the React handle component stays
 * thin: it just calls these and pushes the resulting offset upstream.
 */

const WORD_RE = /[\p{L}\p{N}_]/u;
const isWordChar = (ch: string): boolean => WORD_RE.test(ch);

/**
 * Maps a viewport (x, y) to an absolute character offset in the
 * normalized source text. Uses `caretRangeFromPoint` to find the
 * caret, then walks up to a span carrying `data-segment-start` and
 * adds the in-segment offset.
 *
 * Returns `null` if the point isn't over a known segment.
 */
export function pointToOffset(x: number, y: number): number | null {
  // `caretRangeFromPoint` is Chromium-only; Electron uses Chromium so it's safe.
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const range = doc.caretRangeFromPoint?.(x, y);
  if (!range) return null;
  const node = range.startContainer;
  // Walk up from the text node to find the segment span.
  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : node.parentElement;
  while (el && !el.dataset.segmentStart) el = el.parentElement;
  if (!el?.dataset.segmentStart) return null;
  const base = Number(el.dataset.segmentStart);
  if (Number.isNaN(base)) return null;
  return base + range.startOffset;
}

/**
 * Snap to the nearest word boundary (transition between word / non-word
 * characters). Falls back to the input offset if no transition is
 * within a small window — the user dragged into a long run of letters
 * or whitespace and a snap would feel sticky.
 */
export function snapToWordBoundary(
  text: string,
  offset: number,
  window = 32,
): number {
  if (offset <= 0 || offset >= text.length) return offset;
  if (isWordChar(text[offset - 1]) !== isWordChar(text[offset])) return offset;
  let left = offset;
  const minLeft = Math.max(0, offset - window);
  while (
    left > minLeft &&
    isWordChar(text[left - 1]) === isWordChar(text[left])
  ) {
    left--;
  }
  let right = offset;
  const maxRight = Math.min(text.length, offset + window);
  while (
    right < maxRight &&
    isWordChar(text[right - 1]) === isWordChar(text[right])
  ) {
    right++;
  }
  const leftOk = left > minLeft;
  const rightOk = right < maxRight;
  if (!leftOk && !rightOk) return offset;
  if (!leftOk) return right;
  if (!rightOk) return left;
  return offset - left < right - offset ? left : right;
}

/** Clamp an offset to the open interval (min, max) so neither chunk goes empty. */
export function clampBoundary(offset: number, min: number, max: number): number {
  if (max <= min) return min;
  return Math.max(min, Math.min(max, offset));
}
