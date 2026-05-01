import { describe, expect, it } from "vitest";
import { findArticles, HEADING_PATTERN } from "./articleSplitter";
import { ArticleAwareChunker } from "./ArticleAwareChunker";
import { DefaultTextNormalizer } from "./DefaultTextNormalizer";
import type { ChunkSettings } from "../domain/ChunkingEntities";
import type { TokenCounter } from "../domain/TokenCounter";

const settings = (overrides: Partial<ChunkSettings> = {}): ChunkSettings => ({
  maxChunkTokens: 500,
  minChunkChars: 20,
  headingLookback: 600,
  letterRatio: 40,
  dehyphenate: true,
  splitByArticle: true,
  ...overrides,
});

const fakeTokens: TokenCounter = {
  count: (t) => Math.ceil(t.length / 4),
  countBatch: (texts) => texts.map((t) => Math.ceil(t.length / 4)),
};

describe("findArticles — English markers", () => {
  it("matches 'Article N.-' as a chunk boundary", () => {
    const text = "Article 1.- The body of the first article.";
    expect(findArticles(text)).toEqual([{ article: "1", start: 0 }]);
  });

  it("matches 'Article N.' (single dot) at start of line", () => {
    const text = "Article 5. Body of article 5.";
    expect(findArticles(text)[0]?.article).toBe("5");
  });

  it("matches 'Section N' / 'Sec. N' as article boundaries", () => {
    const a = findArticles("Section 12. Body text follows here.");
    const b = findArticles("Sec. 7.- Body text follows here.");
    expect(a[0]?.article).toBe("12");
    expect(b[0]?.article).toBe("7");
  });

  it("matches the § (silcrow) symbol with or without a space", () => {
    const a = findArticles("§ 1. Body text.");
    const b = findArticles("§3.- Body text.");
    expect(a[0]?.article).toBe("1");
    expect(b[0]?.article).toBe("3");
  });

  it("accepts a colon trailer ('Article 5: ...') common in English statutes", () => {
    const text = "Article 5: This is the body.";
    expect(findArticles(text)[0]?.article).toBe("5");
  });

  it("preserves sub-article notation across English markers", () => {
    const text = "Section 140.1.- Sub-section body.";
    expect(findArticles(text)[0]?.article).toBe("140.1");
  });

  it("does NOT match 'Articles' (plural) — that's a citation, not a heading", () => {
    expect(findArticles("Articles 1, 2 and 3 are referenced here.")).toEqual([]);
  });

  it("does NOT match a mid-sentence English citation", () => {
    expect(findArticles("As provided in Article 5, the body…")).toEqual([]);
  });
});

describe("HEADING_PATTERN — English headings", () => {
  it("matches CHAPTER / SECTION / TITLE / BOOK / PART", () => {
    expect(HEADING_PATTERN.test("CHAPTER I — General Provisions")).toBe(true);
    expect(HEADING_PATTERN.test("SECTION 1")).toBe(true);
    expect(HEADING_PATTERN.test("TITLE V")).toBe(true);
    expect(HEADING_PATTERN.test("BOOK ONE")).toBe(true);
    expect(HEADING_PATTERN.test("PART II")).toBe(true);
  });

  it("is case-insensitive (Chapter as well as CHAPTER)", () => {
    expect(HEADING_PATTERN.test("Chapter 1: Introduction")).toBe(true);
  });

  it("does not match an unrelated word starting with the same letters", () => {
    // \b boundary stops "PARTIAL" from satisfying PART.
    expect(HEADING_PATTERN.test("PARTIALLY filled rows")).toBe(false);
    // BOOKMARK shouldn't be a BOOK heading either.
    expect(HEADING_PATTERN.test("BOOKMARK section")).toBe(false);
  });

  it("still matches the original Spanish set (no regression)", () => {
    expect(HEADING_PATTERN.test("CAPÍTULO I")).toBe(true);
    expect(HEADING_PATTERN.test("SECCIÓN 1")).toBe(true);
    expect(HEADING_PATTERN.test("TÍTULO PRELIMINAR")).toBe(true);
    expect(HEADING_PATTERN.test("DISPOSICIONES TRANSITORIAS")).toBe(true);
  });
});

describe("ArticleAwareChunker — English documents", () => {
  const make = () =>
    new ArticleAwareChunker(new DefaultTextNormalizer(), fakeTokens);

  it("uses article-aware splitting on an all-English document", () => {
    const text = [
      "CHAPTER I — General Provisions",
      "",
      "Article 1.- First article body, well above the minimum char floor.",
      "Article 2.- Second article body, well above the minimum char floor.",
      "Article 3.- Third article body, well above the minimum char floor.",
    ].join("\n");
    const result = make().chunk(text, settings());
    expect(result.strategy).toBe("article");
    expect(result.chunks.length).toBeGreaterThanOrEqual(3);
  });

  it("attaches an English heading to each chunk via the lookback window", () => {
    const text = [
      "CHAPTER I — General Provisions",
      "",
      "Article 1.- First article body, well above the minimum char floor.",
      "Article 2.- Second article body, well above the minimum char floor.",
      "Article 3.- Third article body, well above the minimum char floor.",
    ].join("\n");
    const result = make().chunk(text, settings());
    for (const c of result.chunks) {
      expect(c.heading).toMatch(/^CHAPTER I/i);
    }
  });

  it("handles a mixed Spanish + English document by article", () => {
    // The pattern is a union — both markers should chunk side-by-side.
    const text = [
      "Art. 1.- El cuerpo del primer artículo en español.",
      "Article 2.- Body of the second article in English.",
      "Sec. 3.- Body of the third article using Sec. notation.",
    ].join("\n");
    const result = make().chunk(text, settings());
    expect(result.strategy).toBe("article");
    expect(result.chunks.map((c) => c.article).sort()).toEqual(["1", "2", "3"]);
  });
});
