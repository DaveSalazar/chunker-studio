/**
 * Allowlist-based sanitizer for the HTML mammoth produces from a .docx
 * preview. mammoth's writer is already constrained to a small tag set,
 * but we run the output through here as defense-in-depth before
 * dropping it into `dangerouslySetInnerHTML` — the user-picked file is
 * trusted-by-choice, but a malformed doc shouldn't be able to inject
 * `<script>` or a `javascript:` URL.
 *
 * Pure DOM walk; no third-party sanitizer dependency. The allowlist
 * matches what mammoth actually emits for typical Word documents
 * (paragraphs, headings, lists, tables, basic emphasis, anchors,
 * inline images via data URIs).
 */

const ALLOWED_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "SUP",
  "SUB",
  "A",
  "UL",
  "OL",
  "LI",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TD",
  "TH",
  "IMG",
  "DIV",
  "SPAN",
  "BLOCKQUOTE",
  "HR",
]);

// Per-tag attribute allowlist. Anything not listed is stripped on the
// way out — including event handlers (`onclick=...`) and inline style
// (which wouldn't render anything dangerous on its own but invites
// CSS-injection surprises).
const ALLOWED_ATTRS: Record<string, ReadonlySet<string>> = {
  A: new Set(["href"]),
  IMG: new Set(["src", "alt", "width", "height"]),
  TABLE: new Set(["border", "cellspacing", "cellpadding"]),
  TD: new Set(["colspan", "rowspan"]),
  TH: new Set(["colspan", "rowspan"]),
};

const SAFE_URL_PREFIX = /^(https?:|mailto:|data:image\/|#)/i;

export function sanitizeDocxHtml(rawHtml: string): string {
  if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
    return ""; // Server-side / non-DOM context: refuse rather than ship raw HTML.
  }
  const doc = new window.DOMParser().parseFromString(
    `<div>${rawHtml}</div>`,
    "text/html",
  );
  const root = doc.body.firstElementChild;
  if (!root) return "";
  cleanRecursive(root);
  return root.innerHTML;
}

function cleanRecursive(node: Element): void {
  // Iterate children with a static snapshot — modifying the live list
  // mid-loop skips siblings.
  const children = Array.from(node.children);
  for (const child of children) {
    const tag = child.tagName.toUpperCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Replace disallowed elements with a text node holding their
      // descendant text content — we keep the readable surface, lose
      // the tag itself.
      const text = node.ownerDocument!.createTextNode(child.textContent ?? "");
      node.replaceChild(text, child);
      continue;
    }
    stripAttributes(child, tag);
    cleanRecursive(child);
  }
}

function stripAttributes(el: Element, tag: string): void {
  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
  // Snapshot — removing an attribute mid-iteration on the live list
  // shifts indices and silently skips entries.
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (!allowed.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if ((name === "href" || name === "src") && !SAFE_URL_PREFIX.test(attr.value)) {
      // Drop the unsafe URL but keep the element so its text content
      // still renders (a `<a>` without href degrades to inert text).
      el.removeAttribute(attr.name);
    }
  }
}
