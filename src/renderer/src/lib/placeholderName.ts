/**
 * Pre-fill heuristic for the manual-placeholder popover input.
 * Strips diacritics, uppercases, collapses whitespace, drops non-alphanum.
 * Caps at 40 chars so an accidentally-huge selection doesn't produce
 * an unwieldy default. Falls back to "DATO" (the auto-detection's
 * generic catch-all label) when the cleaned result is empty.
 */
export function defaultPlaceholderName(selectionText: string): string {
  const cleaned = selectionText
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return cleaned || "DATO";
}
