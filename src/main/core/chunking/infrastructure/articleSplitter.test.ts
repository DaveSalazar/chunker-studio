import { describe, expect, it } from "vitest";
import { findArticles, HEADING_PATTERN, splitByArticles } from "./articleSplitter";
import type { ChunkSettings } from "../domain/ChunkingEntities";

const settings = (overrides: Partial<ChunkSettings> = {}): ChunkSettings => ({
  maxChunkTokens: 500,
  minChunkChars: 20,
  headingLookback: 600,
  letterRatio: 40,
  dehyphenate: true,
  splitByArticle: true,
  ...overrides,
});

describe("findArticles", () => {
  it("returns empty for text with no markers", () => {
    expect(findArticles("Just prose with no article markers.")).toEqual([]);
  });

  it("finds a single 'Art. N' marker at start of text", () => {
    const text = "Art. 1.- La ley es soberana.";
    expect(findArticles(text)).toEqual([{ article: "1", start: 0 }]);
  });

  it("finds 'Artículo N' (full word) markers", () => {
    const text = "Artículo 5.- Body text.";
    expect(findArticles(text)[0]?.article).toBe("5");
  });

  it("finds the bare identifier without 'Art.' prefix in the result", () => {
    // The display layer prepends "Art. " when rendering — storing
    // "Art. 1" was the bug that produced "Art. Art. 1" in the viewer.
    const text = "Art. 42.- Body.";
    expect(findArticles(text)[0]?.article).toBe("42");
  });

  it("captures sub-article notation like 140.1", () => {
    const text = "Art. 140.1.- Sub-article body.";
    expect(findArticles(text)[0]?.article).toBe("140.1");
  });

  it("captures deeply nested sub-articles like 140.1.2", () => {
    const text = "Art. 140.1.2.- Further sub.";
    expect(findArticles(text)[0]?.article).toBe("140.1.2");
  });

  it("captures lettered articles like 23A", () => {
    const text = "Art. 23A.- Reformed article.";
    expect(findArticles(text)[0]?.article).toBe("23A");
  });

  it("anchors to start-of-line — does NOT match a mid-sentence citation", () => {
    const text = "Como dispone el Art. 5 del código, la persona…";
    // The regex requires the marker at start of a line OR the very
    // beginning of the text; "Art. 5" mid-sentence shouldn't qualify.
    expect(findArticles(text)).toEqual([]);
  });

  it("finds multiple markers at line starts", () => {
    const text = ["Art. 1.- First.", "Art. 2.- Second.", "Art. 3.- Third."].join("\n");
    const matches = findArticles(text);
    expect(matches.map((m) => m.article)).toEqual(["1", "2", "3"]);
  });

  it("starts each match at the 'A' of 'Art.', not at the leading newline", () => {
    const text = "Preamble.\nArt. 1.- Body.";
    const m = findArticles(text);
    expect(m).toHaveLength(1);
    expect(text.slice(m[0].start, m[0].start + 4)).toBe("Art.");
  });
});

describe("HEADING_PATTERN", () => {
  it.each([
    "CAPÍTULO I — DISPOSICIONES GENERALES",
    "SECCIÓN PRIMERA",
    "TÍTULO PRELIMINAR",
    "LIBRO IV",
    "PARTE GENERAL",
    "DISPOSICIONES TRANSITORIAS", // plural — was previously rejected
    "DISPOSICIONES FINALES", // plural — same fix
    "DISPOSICIÓN FINAL", // singular w/ accent
    "DISPOSICION FINAL", // singular without accent (older sources)
  ])("matches '%s'", (line) => {
    expect(HEADING_PATTERN.test(line)).toBe(true);
  });

  it.each([
    "Art. 1.-",
    "Body paragraph here.",
    "página 4 de 200",
    "",
  ])("does NOT match '%s'", (line) => {
    expect(HEADING_PATTERN.test(line)).toBe(false);
  });
});

describe("splitByArticles", () => {
  it("returns empty array for empty matches", () => {
    expect(splitByArticles("text", [], settings())).toEqual([]);
  });

  it("emits one chunk per article, with correct article identifier", () => {
    const text = [
      "Art. 1.- Body of article one with enough content to clear the minimum.",
      "Art. 2.- Body of article two with enough content to clear the minimum.",
    ].join("\n");
    const matches = findArticles(text);
    const chunks = splitByArticles(text, matches, settings());
    expect(chunks).toHaveLength(2);
    expect(chunks[0].article).toBe("1");
    expect(chunks[1].article).toBe("2");
  });

  it("startOffset/endOffset are inside the original text and bracket the body", () => {
    const text = [
      "Art. 1.- Body alpha with enough content here.",
      "Art. 2.- Body beta with enough content here.",
    ].join("\n");
    const matches = findArticles(text);
    const chunks = splitByArticles(text, matches, settings());
    // Each chunk's slice of the original text should be the chunk's body.
    for (const c of chunks) {
      expect(text.slice(c.startOffset, c.endOffset).trim()).toBe(c.text);
    }
  });

  it("attaches the most recent heading via lookback", () => {
    const text = [
      "TÍTULO PRELIMINAR",
      "",
      "Art. 1.- Body of article one with enough content here.",
      "Art. 2.- Body of article two with enough content here.",
      "",
      "CAPÍTULO I — DE LAS PERSONAS",
      "",
      "Art. 3.- Body of article three with enough content here.",
    ].join("\n");
    const matches = findArticles(text);
    const chunks = splitByArticles(text, matches, settings());
    expect(chunks).toHaveLength(3);
    expect(chunks[0].heading).toMatch(/TÍTULO PRELIMINAR/);
    expect(chunks[1].heading).toMatch(/TÍTULO PRELIMINAR/);
    expect(chunks[2].heading).toMatch(/CAPÍTULO I/);
  });

  it("drops articles whose body is below minChunkChars", () => {
    const text = ["Art. 1.- short.", "Art. 2.- This article has plenty of body content."].join("\n");
    const matches = findArticles(text);
    const chunks = splitByArticles(text, matches, settings({ minChunkChars: 30 }));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].article).toBe("2");
  });

  it("subdivides an article that exceeds the char budget", () => {
    // subdivideLong relies on line breaks — a single 400-char line
    // can't be split, so this test fakes a realistic multi-line body.
    // charBudget = maxChunkTokens * 5 → with maxChunkTokens=20 → 100 chars.
    const lines: string[] = [];
    for (let i = 0; i < 10; i++) {
      lines.push("Body sentence " + "x".repeat(40));
    }
    const text = `Art. 1.- ${lines.join("\n")}`;
    const matches = findArticles(text);
    const chunks = splitByArticles(
      text,
      matches,
      settings({ maxChunkTokens: 20, minChunkChars: 10 }),
    );
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.article).toBe("1");
    }
  });

  it("does NOT subdivide a single very long line (known limitation)", () => {
    // subdivideLong only splits on existing line boundaries. A PDF
    // that produced one giant line with no internal breaks would emit
    // a single oversized chunk. Test pins this behavior so a future
    // refactor that introduces in-line splitting flags it explicitly.
    const text = `Art. 1.- ${"A".repeat(400)}`;
    const matches = findArticles(text);
    const chunks = splitByArticles(
      text,
      matches,
      settings({ maxChunkTokens: 20, minChunkChars: 10 }),
    );
    expect(chunks).toHaveLength(1);
  });

  it("prefers lettered-point boundaries when an article has them", () => {
    // Long article with a) b) c) clauses; the splitter should break at
    // a clause boundary rather than mid-sentence.
    const lines = [
      "Art. 100.- Lead-in paragraph that introduces the enumerated clauses below.",
      "a) primer punto " + "x".repeat(80),
      "b) segundo punto " + "x".repeat(80),
      "c) tercer punto " + "x".repeat(80),
    ];
    const text = lines.join("\n");
    const matches = findArticles(text);
    const chunks = splitByArticles(
      text,
      matches,
      settings({ maxChunkTokens: 30, minChunkChars: 20 }),
    );
    // Each output chunk's text should start either with the "Art. 100"
    // lead-in OR with a lettered-point line (a)/b)/c)).
    for (const c of chunks) {
      const firstLine = c.text.split("\n")[0];
      const ok =
        /^Art\./i.test(firstLine) || /^[a-z]\)/i.test(firstLine.trim());
      expect(ok).toBe(true);
    }
  });
});
