import { injectable } from "inversify";
import type { NormalizeOptions, TextNormalizer } from "../domain/TextNormalizer";

/**
 * Text normalization for article-based document chunking.
 *
 * Pipeline:
 *   1. NFC unicode canonicalization
 *   2. Dehyphenate ("deman-\ndante" → "demandante") — optional
 *   3. Drop noise lines (page footers, lexis URLs, registro oficial, etc.)
 *   4. Collapse trailing whitespace + runs of blank lines
 *
 * Idempotent — running twice produces the same output as running once.
 */
@injectable()
export class DefaultTextNormalizer implements TextNormalizer {
  private readonly noiseLinePatterns: RegExp[] = [
    /^(?:página|pagina|page)\s+\d+\s+(?:de|of)\s+\d+$/i,
    /^\d{1,4}$/,
    /^(?:www\.)?lexis(?:\.com)?(?:\.ec)?$/i,
    /^(?:www\.)?derechoecuador\.com$/i,
    /^registro\s+oficial\s+(?:n[°º]?|#)?\s*\d+/i,
    /^[-_=]{5,}$/,
  ];

  // PDFs break long words across lines with a hyphen ("jurisdic-\nción").
  // Re-join them when the head is alphanumeric and the tail starts with a
  // lowercase letter (uppercase line-starts are usually a new sentence).
  private readonly hyphenBreak = /(\w)-\n([a-záéíóúüñ])/g;

  private readonly trailingSpace = /[ \t]+\n/g;
  private readonly multiBlank = /\n{3,}/g;

  normalize(text: string, options: NormalizeOptions): string {
    let out = text.normalize("NFC");

    if (options.dehyphenate) {
      out = out.replace(this.hyphenBreak, "$1$2");
    }

    out = out
      .split("\n")
      .filter((line) => !this.isNoiseLine(line))
      .join("\n");

    out = out.replace(this.trailingSpace, "\n");
    out = out.replace(this.multiBlank, "\n\n");

    return out.trim();
  }

  private isNoiseLine(line: string): boolean {
    const stripped = line.trim();
    if (stripped.length === 0) return false; // blanks handled separately
    return this.noiseLinePatterns.some((p) => p.test(stripped));
  }
}
