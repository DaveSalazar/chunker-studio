/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { sanitizeDocxHtml } from "./sanitizeDocxHtml";

describe("sanitizeDocxHtml", () => {
  it("preserves typical mammoth output (headings, paragraphs, lists)", () => {
    const html = `
      <h1>Título</h1>
      <p>Cuerpo del documento.</p>
      <ul><li>Uno</li><li>Dos</li></ul>
    `;
    const out = sanitizeDocxHtml(html);
    expect(out).toContain("<h1>Título</h1>");
    expect(out).toContain("<p>Cuerpo del documento.</p>");
    expect(out).toContain("<ul>");
    expect(out).toContain("<li>Uno</li>");
  });

  it("preserves table structure", () => {
    const html =
      "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>";
    const out = sanitizeDocxHtml(html);
    expect(out).toContain("<table>");
    expect(out).toContain("<th>A</th>");
    expect(out).toContain("<td>1</td>");
  });

  it("strips <script> tags (text content survives but the executable tag is gone)", () => {
    const html = "<p>before</p><script>alert(1)</script><p>after</p>";
    const out = sanitizeDocxHtml(html);
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("</script>");
    // mammoth never emits <script>, but a malformed doc still can't
    // smuggle one in: the tag is replaced with a plain text node, so
    // "alert(1)" appears as inert text, not as JS.
    expect(out).toContain("<p>before</p>");
    expect(out).toContain("<p>after</p>");
  });

  it("strips event-handler attributes (onclick / onerror / onload)", () => {
    const html = `<p onclick="boom()">click me</p><img src="data:image/png;base64,xx" onerror="boom()">`;
    const out = sanitizeDocxHtml(html);
    expect(out).not.toMatch(/onclick/i);
    expect(out).not.toMatch(/onerror/i);
    expect(out).toContain("<p>");
    expect(out).toContain("<img");
  });

  it("strips javascript: URLs from anchor href", () => {
    const html = `<a href="javascript:alert(1)">x</a>`;
    const out = sanitizeDocxHtml(html);
    // Anchor stays so its visible text survives, but the href is gone.
    expect(out).toContain("<a>x</a>");
    expect(out).not.toMatch(/javascript:/i);
  });

  it("keeps safe href schemes (http, https, mailto, fragment)", () => {
    const cases = [
      "https://example.com",
      "http://example.com/path",
      "mailto:lawyer@example.com",
      "#section-1",
    ];
    for (const url of cases) {
      const out = sanitizeDocxHtml(`<a href="${url}">link</a>`);
      expect(out).toContain(`href="${url}"`);
    }
  });

  it("keeps mammoth's data:image inline image URIs (the offline preview path)", () => {
    const dataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const out = sanitizeDocxHtml(`<img src="${dataUri}" alt="logo">`);
    expect(out).toContain(`src="${dataUri}"`);
    expect(out).toContain(`alt="logo"`);
  });

  it("strips data: URIs that are NOT images (defends against data:text/html)", () => {
    const out = sanitizeDocxHtml(
      `<a href="data:text/html,<script>alert(1)</script>">x</a>`,
    );
    expect(out).not.toMatch(/data:text\/html/i);
  });

  it("strips inline style attributes", () => {
    const out = sanitizeDocxHtml(`<p style="color:red">x</p>`);
    expect(out).toContain("<p>");
    expect(out).not.toMatch(/style=/i);
  });

  it("returns an empty string for empty input", () => {
    expect(sanitizeDocxHtml("")).toBe("");
  });

  it("preserves emphasis tags (em, strong, sup, sub, i, b)", () => {
    const html = "<p><strong>bold</strong> <em>italic</em> <sup>sup</sup></p>";
    const out = sanitizeDocxHtml(html);
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
    expect(out).toContain("<sup>sup</sup>");
  });
});
