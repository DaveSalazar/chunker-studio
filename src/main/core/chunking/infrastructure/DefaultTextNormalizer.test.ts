import { describe, expect, it } from "vitest";
import "reflect-metadata";
import { DefaultTextNormalizer } from "./DefaultTextNormalizer";

const norm = new DefaultTextNormalizer();
const dehyph = { dehyphenate: true };
const noDehyph = { dehyphenate: false };

describe("DefaultTextNormalizer", () => {
  describe("NFC canonicalization", () => {
    it("normalizes precomposed vs decomposed accents to the same form", () => {
      // U+00E9 vs U+0065 + U+0301 — same visual, different code points.
      const precomposed = "café";
      const decomposed = "café";
      expect(norm.normalize(precomposed, dehyph)).toBe(
        norm.normalize(decomposed, dehyph),
      );
    });
  });

  describe("dehyphenation", () => {
    it("re-joins a word split across two lines (lowercase tail)", () => {
      // Spanish PDFs break words like "deman-\ndante" → "demandante".
      const input = "El deman-\ndante alegó que…";
      expect(norm.normalize(input, dehyph)).toBe("El demandante alegó que…");
    });

    it("does NOT re-join when the tail starts with an uppercase letter", () => {
      // "Foo-\nBar" usually means a new sentence/clause, not a broken word.
      const input = "Foo-\nBar";
      expect(norm.normalize(input, dehyph)).toBe("Foo-\nBar");
    });

    it("respects the dehyphenate=false option", () => {
      const input = "deman-\ndante";
      expect(norm.normalize(input, noDehyph)).toBe("deman-\ndante");
    });

    it("re-joins accented Spanish characters too", () => {
      const input = "jurisdic-\nción";
      expect(norm.normalize(input, dehyph)).toBe("jurisdicción");
    });
  });

  describe("noise-line dropping", () => {
    it("drops 'Página X de Y' page footers", () => {
      const input = ["Real text here.", "Página 4 de 200", "More real text."].join("\n");
      const out = norm.normalize(input, dehyph);
      expect(out).not.toContain("Página 4 de 200");
      expect(out).toContain("Real text here.");
      expect(out).toContain("More real text.");
    });

    it("drops bare-number page-number lines", () => {
      const input = ["Body.", "42", "More body."].join("\n");
      const out = norm.normalize(input, dehyph);
      expect(out).not.toMatch(/^42$/m);
    });

    it("drops lexis.com.ec watermark lines", () => {
      const input = ["Body.", "www.lexis.com.ec", "Body two."].join("\n");
      const out = norm.normalize(input, dehyph);
      expect(out).not.toContain("lexis");
    });

    it("drops 'Registro Oficial Nº 1234' header lines", () => {
      const input = ["Body.", "Registro Oficial Nº 1234", "Body two."].join("\n");
      const out = norm.normalize(input, dehyph);
      expect(out).not.toContain("Registro Oficial");
    });

    it("drops ASCII separator rules (===== / ----- / _____)", () => {
      const input = ["Body.", "==========", "Body two."].join("\n");
      const out = norm.normalize(input, dehyph);
      expect(out).not.toContain("==========");
    });

    it("does NOT drop a long line that just happens to contain a noise-looking substring", () => {
      // The patterns are anchored — a real sentence containing the
      // word "página" embedded in prose should survive.
      const input = "El número de página relevante es 42 según el artículo 5.";
      expect(norm.normalize(input, dehyph)).toBe(input);
    });
  });

  describe("whitespace collapse", () => {
    it("strips trailing spaces before a newline", () => {
      expect(norm.normalize("foo   \nbar", dehyph)).toBe("foo\nbar");
    });

    it("collapses 3+ consecutive newlines into a paragraph break (2 newlines)", () => {
      expect(norm.normalize("foo\n\n\n\n\nbar", dehyph)).toBe("foo\n\nbar");
    });

    it("preserves a single paragraph break (\\n\\n)", () => {
      expect(norm.normalize("foo\n\nbar", dehyph)).toBe("foo\n\nbar");
    });

    it("trims the final result", () => {
      expect(norm.normalize("\n\n  hello  \n\n", dehyph)).toBe("hello");
    });
  });

  describe("idempotency", () => {
    it("running normalize twice produces the same result as once", () => {
      const input = [
        "El deman-",
        "dante alegó.",
        "",
        "Página 1 de 10",
        "==========",
        "",
        "",
        "Body line.",
      ].join("\n");
      const once = norm.normalize(input, dehyph);
      const twice = norm.normalize(once, dehyph);
      expect(twice).toBe(once);
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(norm.normalize("", dehyph)).toBe("");
    });

    it("returns empty string when input is only whitespace + noise", () => {
      const input = ["   ", "Página 1 de 10", "==========", ""].join("\n");
      expect(norm.normalize(input, dehyph)).toBe("");
    });
  });
});
