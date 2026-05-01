import { describe, expect, it } from "vitest";
import { isUseful, scoreChunks } from "./chunkFinalize";
import type { ChunkSettings, RawChunk } from "../domain/ChunkingEntities";
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

const raw = (overrides: Partial<RawChunk> = {}): RawChunk => ({
  text: "",
  article: null,
  heading: null,
  startOffset: 0,
  endOffset: 0,
  ...overrides,
});

/** Predictable token counter — returns one token per 4 chars. */
const fakeTokens: TokenCounter = {
  count: (text) => Math.ceil(text.length / 4),
  countBatch: (texts) => texts.map((t) => Math.ceil(t.length / 4)),
};

describe("isUseful", () => {
  describe("min-char filter", () => {
    it("rejects a chunk shorter than minChunkChars (after trim)", () => {
      const chunk = raw({ text: "  short  " });
      expect(isUseful(chunk, settings({ minChunkChars: 20 }))).toBe(false);
    });

    it("accepts a chunk exactly meeting minChunkChars (length match, ratio passes)", () => {
      const text = "a".repeat(20); // 20 letters, 100% letter ratio
      expect(isUseful(raw({ text }), settings({ minChunkChars: 20 }))).toBe(true);
    });

    it("trims before measuring length", () => {
      const text = "   " + "a".repeat(15) + "   ";
      // Trimmed = 15 chars, below minChunkChars of 20 → reject.
      expect(isUseful(raw({ text }), settings({ minChunkChars: 20 }))).toBe(false);
    });
  });

  describe("heading-only single-line filter", () => {
    it("rejects a single-line chunk that is just a section heading", () => {
      const text = "CAPÍTULO I — DISPOSICIONES GENERALES";
      expect(isUseful(raw({ text }), settings({ minChunkChars: 5 }))).toBe(false);
    });

    it("accepts a heading line that's followed by body text", () => {
      const text = "CAPÍTULO I — DISPOSICIONES GENERALES\nArt. 1.- Body text follows.";
      expect(isUseful(raw({ text }), settings({ minChunkChars: 5 }))).toBe(true);
    });

    it("accepts non-heading single-line chunks", () => {
      const text = "Art. 1.- Body of article one with enough letters here.";
      expect(isUseful(raw({ text }), settings({ minChunkChars: 5 }))).toBe(true);
    });
  });

  describe("letter-ratio filter (drops noise)", () => {
    it("rejects a chunk that's mostly numbers/punctuation (e.g., a stray table)", () => {
      // 5 letters out of 30 chars = 16.7% < 40% threshold.
      const text = "abcde 1234 5678 9101112 13141";
      expect(isUseful(raw({ text }), settings({ minChunkChars: 5 }))).toBe(false);
    });

    it("accepts a prose chunk with high letter ratio", () => {
      const text = "La parte demandante alegó que su contraparte incumplió las obligaciones.";
      expect(isUseful(raw({ text }), settings({ minChunkChars: 5 }))).toBe(true);
    });

    it("threshold is configurable — letterRatio=10 lets a 17%-letter chunk through", () => {
      // Same input as the previous test: 5 letters / 29 chars ≈ 17%.
      // At 40% threshold → rejected. At 10% threshold → accepted.
      const text = "abcde 1234 5678 9101112 13141";
      expect(isUseful(raw({ text }), settings({ minChunkChars: 5, letterRatio: 10 }))).toBe(true);
    });

    it("counts unicode letters (Spanish accents, ñ)", () => {
      const text = "ñáéíóú " + "x".repeat(30);
      expect(isUseful(raw({ text }), settings({ minChunkChars: 5 }))).toBe(true);
    });
  });
});

describe("scoreChunks", () => {
  it("returns empty array for empty input", () => {
    expect(scoreChunks([], fakeTokens)).toEqual([]);
  });

  it("indexes chunks 1-based", () => {
    const chunks = [
      raw({ text: "alpha alpha alpha alpha" }),
      raw({ text: "beta beta beta beta" }),
      raw({ text: "gamma gamma gamma gamma" }),
    ];
    const scored = scoreChunks(chunks, fakeTokens);
    expect(scored.map((c) => c.index)).toEqual([1, 2, 3]);
  });

  it("sets charCount to text.length", () => {
    const chunks = [raw({ text: "twelve chars" })];
    expect(scoreChunks(chunks, fakeTokens)[0].charCount).toBe(12);
  });

  it("uses the TokenCounter.countBatch return values", () => {
    // Fake counter returns ceil(length/4); for 12 chars → 3 tokens.
    const chunks = [raw({ text: "twelve chars" })];
    expect(scoreChunks(chunks, fakeTokens)[0].tokenCount).toBe(3);
  });

  it("preserves all RawChunk fields (article, heading, offsets)", () => {
    const chunks = [
      raw({
        text: "body",
        article: "1",
        heading: "TÍTULO PRELIMINAR",
        startOffset: 100,
        endOffset: 104,
      }),
    ];
    const [scored] = scoreChunks(chunks, fakeTokens);
    expect(scored.article).toBe("1");
    expect(scored.heading).toBe("TÍTULO PRELIMINAR");
    expect(scored.startOffset).toBe(100);
    expect(scored.endOffset).toBe(104);
  });

  it("calls countBatch ONCE for all chunks (single tiktoken pass)", () => {
    const calls: string[][] = [];
    const counter: TokenCounter = {
      count: (t) => t.length,
      countBatch: (texts) => {
        calls.push(texts);
        return texts.map((t) => t.length);
      },
    };
    scoreChunks(
      [raw({ text: "a" }), raw({ text: "bb" }), raw({ text: "ccc" })],
      counter,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(["a", "bb", "ccc"]);
  });

  it("defaults tokenCount to 0 when the counter returns short array", () => {
    const counter: TokenCounter = {
      count: () => 0,
      countBatch: () => [], // pathological — returns nothing
    };
    const scored = scoreChunks([raw({ text: "x" })], counter);
    expect(scored[0].tokenCount).toBe(0);
  });
});
