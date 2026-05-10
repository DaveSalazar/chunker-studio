/**
 * Converts mammoth's `convertToHtml` output into "rich text": plain
 * text with `**bold**` markers preserved and structural whitespace
 * (paragraph breaks, list indentation) intact. Lossy on purpose —
 * tables get linearised, images vanish — because the downstream
 * consumers (chunker → embedder → LLM scaffold) only need the textual
 * spine, not page-faithful rendering.
 *
 * Why the markdown bold marker survives: legal templates use bold for
 * structural anchors ("SEÑOR JUEZ", "PRIMERA:", "DEMANDA"). Stripping
 * them collapses the template into anonymous prose and the LLM loses
 * the visual scaffolding that tells it where each section starts.
 *
 * Pure regex-based — no DOMParser dep so it runs in the worker thread
 * (which has no DOM). Mammoth's writer emits a small, predictable tag
 * set, so the regex approach is safe; arbitrary HTML would not be.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function docxHtmlToRichText(html: string): string {
  let s = html;

  // 1. Bold runs → markdown markers. Done before tag-stripping so the
  // marker syntax isn't accidentally swallowed. Empty bold runs (which
  // mammoth occasionally emits at paragraph boundaries) are dropped to
  // avoid stranded `****` artifacts.
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, inner) => {
    const trimmed = String(inner).trim();
    return trimmed.length === 0 ? "" : `**${trimmed}**`;
  });

  // 2. List items → "- text" lines. Done before block normalization so
  // the leading "- " survives the paragraph-break pass.
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `- ${inner}\n`);

  // 3. Block-level closers → paragraph breaks. Headings, paragraphs,
  // and the various block wrappers all collapse to "\n\n" so the
  // chunker / preview see clean paragraph segmentation.
  s = s.replace(/<\/(p|h[1-6]|blockquote|div|ul|ol|table|tr)>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");

  // 4. Strip every remaining tag — opening tags (already-closed by the
  // pass above) plus any standalone <img>, <hr>, etc.
  s = s.replace(/<[^>]+>/g, "");

  // 5. Decode the small set of HTML entities mammoth's output may
  // include; numeric refs handled with a single sweep.
  s = s.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/gi, (m) =>
    ENTITIES[m.toLowerCase()] ?? m,
  );
  s = s.replace(/&#(\d+);/g, (_, n) =>
    String.fromCodePoint(parseInt(n, 10)),
  );
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) =>
    String.fromCodePoint(parseInt(h, 16)),
  );

  // 6. Tighten whitespace: trailing-space-before-newline, runs of 3+
  // newlines collapsed to a paragraph break, leading/trailing trim.
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}
