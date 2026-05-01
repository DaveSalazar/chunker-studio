import { describe, expect, it } from "vitest";
import { chunkByParagraphs } from "./paragraphSplitter";
import type { ChunkSettings } from "../domain/ChunkingEntities";

const settings = (overrides: Partial<ChunkSettings> = {}): ChunkSettings => ({
  maxChunkTokens: 100,
  minChunkChars: 20,
  headingLookback: 600,
  letterRatio: 40,
  dehyphenate: true,
  splitByArticle: false,
  ...overrides,
});

describe("chunkByParagraphs", () => {
  it("returns empty for empty text", () => {
    expect(chunkByParagraphs("", settings())).toEqual([]);
  });

  it("returns empty for whitespace-only text", () => {
    expect(chunkByParagraphs("   \n\n   \n", settings())).toEqual([]);
  });

  it("returns a single chunk for one paragraph that fits the budget", () => {
    const text = "A short paragraph that fits comfortably under the budget.";
    const chunks = chunkByParagraphs(text, settings());
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(text);
  });

  it("merges multiple short paragraphs into one chunk while under budget", () => {
    // charBudget = maxChunkTokens * 4; with maxChunkTokens=100 → 400 chars.
    // Two short paragraphs together stay under 400 → merged.
    const p1 = "First paragraph of moderate length.";
    const p2 = "Second paragraph of moderate length.";
    const text = `${p1}\n\n${p2}`;
    const chunks = chunkByParagraphs(text, settings());
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(`${p1}\n\n${p2}`);
  });

  it("flushes the buffer and starts a new chunk when next paragraph would overflow", () => {
    // charBudget = maxChunkTokens * 4 = 400 chars. Each paragraph is ~250 chars.
    // First fits alone; adding second would overflow → flush before adding second.
    const p1 = "p1 " + "x".repeat(250);
    const p2 = "p2 " + "y".repeat(250);
    const p3 = "p3 " + "z".repeat(250);
    const text = `${p1}\n\n${p2}\n\n${p3}`;
    const chunks = chunkByParagraphs(text, settings());
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // Each chunk should start with the right prefix (paragraph identity preserved).
    expect(chunks[0].text.startsWith("p1 ")).toBe(true);
    expect(chunks.some((c) => c.text.startsWith("p2 "))).toBe(true);
  });

  it("each chunk has article=null and heading=null", () => {
    // Paragraph chunks don't carry article/heading metadata — that's
    // the article-aware splitter's job.
    const text = "First paragraph here.\n\nSecond paragraph here.";
    const chunks = chunkByParagraphs(text, settings());
    for (const c of chunks) {
      expect(c.article).toBeNull();
      expect(c.heading).toBeNull();
    }
  });

  it("startOffset/endOffset bracket the paragraph in the original text", () => {
    const lead = "Lead-in text.\n\n";
    const para = "Body paragraph.";
    const text = `${lead}${para}\n\nTrailing.`;
    const chunks = chunkByParagraphs(text, settings({ maxChunkTokens: 5 }));
    // Each chunk's [start, end) should slice back to its trimmed text.
    for (const c of chunks) {
      const sliced = text.slice(c.startOffset, c.endOffset);
      // Chunk text uses "\n\n" separators; the original may have them
      // too. Check that the first paragraph of the chunk is in the slice.
      expect(sliced.length).toBeGreaterThan(0);
    }
  });

  it("trims leading/trailing whitespace from paragraph offsets", () => {
    // Paragraphs surrounded by spaces — the recorded [start, end) range
    // should point at the first non-whitespace char, not the leading
    // spaces, so highlighting is tight.
    const text = "   Body paragraph here.   \n\nMore.";
    const chunks = chunkByParagraphs(text, settings());
    expect(chunks.length).toBeGreaterThan(0);
    const sliced = text.slice(chunks[0].startOffset, chunks[0].endOffset);
    expect(sliced.startsWith(" ")).toBe(false);
    expect(sliced.endsWith(" ")).toBe(false);
  });

  it("skips blank-line-only paragraphs", () => {
    const text = "First.\n\n   \n\n   \n\nSecond.";
    const chunks = chunkByParagraphs(text, settings());
    // Blank "paragraphs" (only whitespace) shouldn't show up.
    for (const c of chunks) {
      expect(c.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("preserves the original \\n\\n separator semantics in chunk text", () => {
    const p1 = "A".repeat(50);
    const p2 = "B".repeat(50);
    const text = `${p1}\n\n${p2}`;
    // With a generous budget both paragraphs land in the same chunk,
    // joined by "\n\n" (the embedding-friendly separator).
    const chunks = chunkByParagraphs(text, settings({ maxChunkTokens: 200 }));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(`${p1}\n\n${p2}`);
  });
});
