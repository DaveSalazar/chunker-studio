import { describe, expect, it } from "vitest";
import "reflect-metadata";
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

/** Predictable token counter for assertions. 1 token per 4 chars. */
const fakeTokens: TokenCounter = {
  count: (t) => Math.ceil(t.length / 4),
  countBatch: (texts) => texts.map((t) => Math.ceil(t.length / 4)),
};

const make = (): ArticleAwareChunker =>
  new ArticleAwareChunker(new DefaultTextNormalizer(), fakeTokens);

describe("ArticleAwareChunker (integration)", () => {
  describe("strategy selection", () => {
    it("uses article-aware splitting when ≥3 markers are found", () => {
      const text = [
        "TÍTULO PRELIMINAR",
        "",
        "Art. 1.- First article body, well above the minimum char floor.",
        "Art. 2.- Second article body, well above the minimum char floor.",
        "Art. 3.- Third article body, well above the minimum char floor.",
      ].join("\n");
      const result = make().chunk(text, settings());
      expect(result.strategy).toBe("article");
      expect(result.chunks.length).toBeGreaterThanOrEqual(3);
    });

    it("falls back to paragraphs when only 2 article markers exist", () => {
      const text = [
        "Art. 1.- First article body, well above the minimum char floor.",
        "Art. 2.- Second article body, well above the minimum char floor.",
      ].join("\n");
      const result = make().chunk(text, settings());
      expect(result.strategy).toBe("paragraph");
    });

    it("falls back to paragraphs when splitByArticle is false (even with 5+ markers)", () => {
      const text = [
        "Art. 1.- Body of first article above min chars.",
        "Art. 2.- Body of second article above min chars.",
        "Art. 3.- Body of third article above min chars.",
        "Art. 4.- Body of fourth article above min chars.",
        "Art. 5.- Body of fifth article above min chars.",
      ].join("\n");
      const result = make().chunk(text, settings({ splitByArticle: false }));
      expect(result.strategy).toBe("paragraph");
    });
  });

  describe("ChunkingOutcome shape", () => {
    const text = [
      "TÍTULO PRELIMINAR",
      "",
      "Art. 1.- Body of first article above the min char floor.",
      "Art. 2.- Body of second article above the min char floor.",
      "Art. 3.- Body of third article above the min char floor.",
    ].join("\n");

    it("returns the full ChunkingOutcome shape", () => {
      const result = make().chunk(text, settings());
      expect(result).toHaveProperty("chunks");
      expect(result).toHaveProperty("normalizedText");
      expect(result).toHaveProperty("strategy");
      expect(result).toHaveProperty("totalTokens");
      expect(result).toHaveProperty("totalChars");
    });

    it("totals match the sum of per-chunk token + char counts", () => {
      const result = make().chunk(text, settings());
      const sumTokens = result.chunks.reduce((s, c) => s + c.tokenCount, 0);
      const sumChars = result.chunks.reduce((s, c) => s + c.charCount, 0);
      expect(result.totalTokens).toBe(sumTokens);
      expect(result.totalChars).toBe(sumChars);
    });

    it("emits 1-based, monotonically increasing chunk indices", () => {
      const result = make().chunk(text, settings());
      const indices = result.chunks.map((c) => c.index);
      expect(indices).toEqual(indices.slice().sort((a, b) => a - b));
      expect(indices[0]).toBe(1);
    });

    it("normalizedText survives end-to-end (cleaned, ready to embed)", () => {
      const result = make().chunk(text, settings());
      // Heading line dropped is NOT a property of the normalizer — heading
      // pattern survives. But noise lines (page numbers etc) would be
      // gone. Spot-check that the article body is present.
      expect(result.normalizedText).toContain("Art. 1.-");
    });
  });

  describe("normalization runs before splitting", () => {
    it("dehyphenates a word split across two lines (when option is on)", () => {
      const text = [
        "Art. 1.- El deman-",
        "dante alegó que…with enough body content here.",
        "Art. 2.- Body of the second article goes here too.",
        "Art. 3.- Body of the third article goes here too.",
      ].join("\n");
      const result = make().chunk(text, settings());
      expect(result.normalizedText).toContain("demandante");
      expect(result.normalizedText).not.toContain("deman-\ndante");
    });

    it("drops 'Página X de Y' noise before chunking", () => {
      const text = [
        "Página 1 de 50",
        "Art. 1.- Body of first article above the min char floor.",
        "Art. 2.- Body of second article above the min char floor.",
        "Art. 3.- Body of third article above the min char floor.",
      ].join("\n");
      const result = make().chunk(text, settings());
      expect(result.normalizedText).not.toContain("Página 1 de 50");
    });
  });

  describe("filters apply", () => {
    it("drops a chunk whose article body is too short", () => {
      const text = [
        "Art. 1.- short.",
        "Art. 2.- Body of second article above the min char floor.",
        "Art. 3.- Body of third article above the min char floor.",
        "Art. 4.- Body of fourth article above the min char floor.",
      ].join("\n");
      const result = make().chunk(text, settings({ minChunkChars: 30 }));
      const articles = result.chunks.map((c) => c.article);
      expect(articles).not.toContain("1");
      expect(articles).toEqual(expect.arrayContaining(["2", "3", "4"]));
    });

    it("article identifier is the bare number, not 'Art. N'", () => {
      const text = [
        "Art. 100.- Body of article 100 above the min char floor.",
        "Art. 200.- Body of article 200 above the min char floor.",
        "Art. 300.- Body of article 300 above the min char floor.",
      ].join("\n");
      const result = make().chunk(text, settings());
      for (const c of result.chunks) {
        expect(c.article).not.toMatch(/^Art\./);
      }
    });
  });

  describe("paragraph fallback path", () => {
    it("emits chunks with article=null when falling back to paragraphs", () => {
      const text = "Just plain prose with no article markers at all here.";
      const result = make().chunk(text, settings());
      expect(result.strategy).toBe("paragraph");
      for (const c of result.chunks) {
        expect(c.article).toBeNull();
        expect(c.heading).toBeNull();
      }
    });
  });

  describe("empty / pathological inputs", () => {
    it("returns an empty result for empty input", () => {
      const result = make().chunk("", settings());
      expect(result.chunks).toEqual([]);
      expect(result.totalTokens).toBe(0);
      expect(result.totalChars).toBe(0);
    });

    it("returns an empty result when input is only noise lines", () => {
      const text = ["Página 1 de 50", "==========", "12"].join("\n");
      const result = make().chunk(text, settings());
      expect(result.chunks).toEqual([]);
    });
  });
});
