/**
 * Bridge between the rendered "normalized" text the operator sees in
 * SourcePreview and the underlying `parsed.text` we have to mutate when
 * they manually mark a placeholder.
 *
 * Two coordinate systems are in play:
 *   - Normalized: what the user sees + selects. Auto-detected blanks
 *     have already been replaced with `<<NAME>>` tokens.
 *   - Source (parsed.text): what we write back. Auto-detection runs
 *     again on the next chunk, so manual edits land here.
 *
 * Engulf works purely in normalized coords (we look for any `<<...>>`
 * token the selection overlaps and extend the range outward). Source
 * mapping then translates the engulfed range using the auto-detection
 * `PlaceholderMatch[]` deltas. Manual placeholders are identical in
 * both coordinate systems, so the source mapping naturally handles
 * them without any special-casing.
 */
import type { PlaceholderMatch } from "./placeholders";

export interface NormSpan {
  start: number;
  end: number;
}

const PLACEHOLDER_TOKEN = /<<[^<>]*>>/g;

/**
 * Every `<<...>>` token in the rendered text. Picks up both
 * auto-detected and previously-marked manual placeholders, since both
 * land in the same syntactic shape after normalization.
 */
export function findPlaceholderTokens(normText: string): NormSpan[] {
  const out: NormSpan[] = [];
  PLACEHOLDER_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_TOKEN.exec(normText)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export interface EngulfResult {
  engStart: number;
  engEnd: number;
  /** True when engulf widened the range past the caller's input. */
  widened: boolean;
}

/**
 * Snap-engulf: extend [start, end] outward to fully contain any span
 * it overlaps. Spans must be non-overlapping (which `findPlaceholderTokens`
 * guarantees because the regex is greedy and non-recursive).
 *
 * Single pass works because spans are sorted ascending; once we've
 * passed a span without overlap, any subsequent widening of the range
 * can only extend rightward, so the earlier span remains untouched.
 */
export function engulfRange(
  spans: readonly NormSpan[],
  start: number,
  end: number,
): EngulfResult {
  if (end < start) throw new Error("end must be ≥ start");
  let engStart = start;
  let engEnd = end;
  let widened = false;
  for (const span of spans) {
    if (engStart < span.end && engEnd > span.start) {
      if (engStart > span.start) {
        engStart = span.start;
        widened = true;
      }
      if (engEnd < span.end) {
        engEnd = span.end;
        widened = true;
      }
    }
  }
  return { engStart, engEnd, widened };
}

/**
 * Convert a normalized-text offset to its parsed-text (source) offset
 * given the auto-detection match list. Offsets that land exactly on a
 * match's normalized boundary map to the corresponding source boundary;
 * offsets strictly inside a match's replacement span shouldn't reach
 * here (engulf must run first).
 */
export function normToSource(
  matches: readonly PlaceholderMatch[],
  normOffset: number,
): number {
  let delta = 0;
  for (const m of matches) {
    const ns = m.start + delta;
    const ne = ns + m.replacement.length;
    if (normOffset <= ns) return normOffset - delta;
    if (normOffset === ne) return m.end;
    delta += m.replacement.length - (m.end - m.start);
  }
  return normOffset - delta;
}

/** Replace `parsedText[start..end]` with the wrapped placeholder. */
export function applyManualPlaceholder(
  parsedText: string,
  sourceStart: number,
  sourceEnd: number,
  name: string,
): string {
  return (
    parsedText.slice(0, sourceStart) +
    `<<${name}>>` +
    parsedText.slice(sourceEnd)
  );
}
