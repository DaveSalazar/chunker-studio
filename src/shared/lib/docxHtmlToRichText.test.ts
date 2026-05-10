import { describe, expect, it } from "vitest";
import { docxHtmlToRichText } from "./docxHtmlToRichText";

describe("docxHtmlToRichText", () => {
  describe("bold preservation (the headline feature)", () => {
    it("rewrites <strong> as **markdown bold**", () => {
      expect(docxHtmlToRichText("<p><strong>SEÑOR JUEZ</strong></p>")).toBe(
        "**SEÑOR JUEZ**",
      );
    });

    it("rewrites <b> the same way as <strong>", () => {
      expect(docxHtmlToRichText("<p>Asunto: <b>importante</b>.</p>")).toBe(
        "Asunto: **importante**.",
      );
    });

    it("preserves bold inside paragraphs alongside other text", () => {
      const out = docxHtmlToRichText(
        "<p><strong>PRIMERA:</strong> Antecedentes del contrato.</p>",
      );
      expect(out).toBe("**PRIMERA:** Antecedentes del contrato.");
    });

    it("handles nested bold runs (mammoth occasionally emits these)", () => {
      const out = docxHtmlToRichText(
        "<p>Texto <strong>con un <b>doble</b> bold</strong> aquí.</p>",
      );
      // Inner <b> is rewritten first → "**doble**" — then the outer
      // <strong> wraps the whole inner span. Acceptable shape.
      expect(out).toContain("**");
      expect(out).toContain("doble");
    });

    it("drops empty bold runs (no stranded ****)", () => {
      // mammoth occasionally emits <strong></strong> at paragraph
      // boundaries when an operator toggled bold without typing.
      expect(docxHtmlToRichText("<p>antes <strong></strong> después</p>")).toBe(
        "antes  después",
      );
    });
  });

  describe("structural whitespace", () => {
    it("inserts paragraph breaks after </p>", () => {
      const out = docxHtmlToRichText("<p>uno</p><p>dos</p><p>tres</p>");
      expect(out).toBe("uno\n\ndos\n\ntres");
    });

    it("inserts paragraph breaks after headings", () => {
      const out = docxHtmlToRichText("<h1>Título</h1><p>cuerpo</p>");
      expect(out).toBe("Título\n\ncuerpo");
    });

    it("renders <li> as '- text' lines", () => {
      const out = docxHtmlToRichText(
        "<ul><li>uno</li><li>dos</li><li>tres</li></ul>",
      );
      expect(out).toContain("- uno");
      expect(out).toContain("- dos");
      expect(out).toContain("- tres");
    });

    it("collapses runs of blank lines to a single paragraph break", () => {
      const out = docxHtmlToRichText("<p>uno</p><p></p><p></p><p>dos</p>");
      expect(out).toBe("uno\n\ndos");
    });

    it("converts <br> to a single newline (not a paragraph break)", () => {
      expect(docxHtmlToRichText("<p>uno<br>dos</p>")).toBe("uno\ndos");
      expect(docxHtmlToRichText("<p>uno<br/>dos</p>")).toBe("uno\ndos");
    });
  });

  describe("entity decoding", () => {
    it("decodes the common named entities", () => {
      expect(docxHtmlToRichText("<p>A &amp; B</p>")).toBe("A & B");
      expect(docxHtmlToRichText("<p>1 &lt; 2</p>")).toBe("1 < 2");
      expect(docxHtmlToRichText("<p>&quot;cita&quot;</p>")).toBe('"cita"');
      expect(docxHtmlToRichText("<p>foo&nbsp;bar</p>")).toBe("foo bar");
    });

    it("decodes numeric entities (decimal and hex)", () => {
      expect(docxHtmlToRichText("<p>caf&#233;</p>")).toBe("café");
      expect(docxHtmlToRichText("<p>caf&#xe9;</p>")).toBe("café");
    });
  });

  describe("tag stripping", () => {
    it("drops <img> entirely", () => {
      const out = docxHtmlToRichText(
        '<p>Logo: <img src="data:image/png;base64,xx" /> aquí</p>',
      );
      expect(out).toBe("Logo:  aquí");
    });

    it("drops <a> tags but keeps the link text", () => {
      const out = docxHtmlToRichText(
        '<p>Ver <a href="https://x">aquí</a> el contrato.</p>',
      );
      expect(out).toBe("Ver aquí el contrato.");
    });

    it("strips inline style attributes via the generic tag-strip pass", () => {
      expect(docxHtmlToRichText('<p style="color:red">x</p>')).toBe("x");
    });
  });

  describe("realistic minuta snippet", () => {
    it("preserves the bold structural anchors and paragraph layout", () => {
      const html = `
        <h1>MINUTA ACLARATORIA</h1>
        <p><strong>SEÑOR NOTARIO:</strong></p>
        <p>En el protocolo de su despacho sírvase incorporar la
        siguiente minuta aclaratoria.</p>
        <p><strong>PRIMERA:</strong> Antecedentes.</p>
        <p><strong>SEGUNDA:</strong> Aclaración.</p>
      `;
      const out = docxHtmlToRichText(html);
      expect(out).toContain("**SEÑOR NOTARIO:**");
      expect(out).toContain("**PRIMERA:**");
      expect(out).toContain("**SEGUNDA:**");
      expect(out).toMatch(/MINUTA ACLARATORIA\n\n/);
    });
  });
});
