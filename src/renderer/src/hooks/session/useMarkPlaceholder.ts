import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  applyManualPlaceholder,
  engulfRange,
  findPlaceholderTokens,
  normToSource,
} from "@shared/lib/placeholderEngulf";
import { analyzePlaceholders } from "@shared/lib/placeholders";
import { updateDocById } from "./helpers";
import type { ChunkerSessionState } from "./types";

type SetState = Dispatch<SetStateAction<ChunkerSessionState>>;

/**
 * Manual placeholder marker. Translates the operator's selection (in
 * normalized-text coordinates) back to the underlying `parsed.text`,
 * snap-engulfing any auto-detected placeholder span the selection
 * straddled, then wraps the source range with `<<NAME>>`.
 *
 * Side-effects:
 *   - Clears `result` and `manualMode`, which forces useRechunkEffect
 *     to re-run on the new text. Any manual chunk-boundary edits the
 *     operator made are lost — placeholder edits are rare enough that
 *     this tradeoff beats the bookkeeping needed to preserve them.
 *   - Drops the `lastChunked` signature for the doc so the rechunk
 *     effect actually runs (otherwise a length-preserving edit could
 *     hash to the same signature and skip).
 *
 * The auto-normalization pass is idempotent on `<<NAME>>` markers
 * (none of its patterns match angle-bracket-uppercase tokens), so
 * subsequent re-chunks preserve the manual placeholder.
 */
export function useMarkPlaceholder(
  setState: SetState,
  lastChunked: MutableRefObject<Map<string, string>>,
) {
  return useCallback(
    (id: string, normStart: number, normEnd: number, name: string) => {
      const trimmed = name.trim();
      if (!trimmed || normEnd <= normStart) return;
      setState((s) => {
        const doc = s.documents.find((d) => d.id === id);
        if (!doc || !doc.parsed || !doc.result) return s;
        const parsedText = doc.parsed.text;
        const normalizedText = doc.result.normalizedText;
        // Engulf in normalized coords against every <<...>> token (auto
        // and previously-marked manual). Source mapping then uses only
        // the auto-detection list because manual placeholders are
        // identical in source and normalized.
        const tokens = findPlaceholderTokens(normalizedText);
        const eng = engulfRange(tokens, normStart, normEnd);
        const matches =
          normalizedText === parsedText ? [] : analyzePlaceholders(parsedText);
        const sourceStart = normToSource(matches, eng.engStart);
        const sourceEnd = normToSource(matches, eng.engEnd);
        const nextText = applyManualPlaceholder(
          parsedText,
          sourceStart,
          sourceEnd,
          trimmed,
        );
        if (nextText === parsedText) return s;
        return updateDocById(s, id, {
          parsed: { ...doc.parsed, text: nextText },
          result: null,
          manualMode: false,
          loading: "chunking",
        });
      });
      lastChunked.current.delete(id);
    },
    [setState, lastChunked],
  );
}
