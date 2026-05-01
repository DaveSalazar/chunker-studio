import { describe, expect, it } from "vitest";
import { pageForChunk } from "./pageForChunk";
import type { ChunkRecord, ParsedDocument } from "@shared/types";

const baseChunk = (overrides: Partial<ChunkRecord> = {}): ChunkRecord => ({
  index: 0,
  article: null,
  heading: null,
  text: "",
  charCount: 0,
  tokenCount: 0,
  startOffset: 0,
  endOffset: 0,
  ...overrides,
});

const parsed = (overrides: Partial<ParsedDocument> = {}): ParsedDocument => ({
  path: "/x.pdf",
  name: "x.pdf",
  extension: "pdf",
  text: "",
  warnings: [],
  ...overrides,
});

describe("pageForChunk", () => {
  describe("returns null when mapping is impossible", () => {
    it("null parsed", () => {
      expect(pageForChunk(baseChunk(), null, 100)).toBeNull();
    });

    it("missing pageOffsets (e.g. DOCX, pre-v3 cache)", () => {
      expect(
        pageForChunk(baseChunk(), parsed({ text: "abc" }), 3),
      ).toBeNull();
    });

    it("empty pageOffsets array", () => {
      expect(
        pageForChunk(
          baseChunk(),
          parsed({ text: "abc", pageOffsets: [] }),
          3,
        ),
      ).toBeNull();
    });

    it("zero-length normalized text", () => {
      expect(
        pageForChunk(
          baseChunk(),
          parsed({ text: "abc", pageOffsets: [0] }),
          0,
        ),
      ).toBeNull();
    });

    it("zero-length raw text", () => {
      expect(
        pageForChunk(
          baseChunk(),
          parsed({ text: "", pageOffsets: [0] }),
          100,
        ),
      ).toBeNull();
    });
  });

  describe("single-page document", () => {
    it("returns page 1 for any chunk on a 1-page doc", () => {
      const doc = parsed({ text: "hello world", pageOffsets: [0] });
      expect(pageForChunk(baseChunk({ startOffset: 0 }), doc, 11)).toBe(1);
      expect(pageForChunk(baseChunk({ startOffset: 5 }), doc, 11)).toBe(1);
      expect(pageForChunk(baseChunk({ startOffset: 10 }), doc, 11)).toBe(1);
    });
  });

  describe("multi-page document, no normalization shift", () => {
    // Raw + normalized are equal length → ratio = 1, raw offset == normalized offset.
    // pageOffsets at [0, 100, 200] mean: page 1 is chars 0–99, page 2 is 100–199, page 3 is 200+.
    const doc = parsed({
      text: "a".repeat(300),
      pageOffsets: [0, 100, 200],
    });

    it("offset 0 maps to page 1", () => {
      expect(pageForChunk(baseChunk({ startOffset: 0 }), doc, 300)).toBe(1);
    });

    it("offset just below page-2 boundary stays on page 1", () => {
      expect(pageForChunk(baseChunk({ startOffset: 99 }), doc, 300)).toBe(1);
    });

    it("offset exactly at page-2 boundary lands on page 2", () => {
      expect(pageForChunk(baseChunk({ startOffset: 100 }), doc, 300)).toBe(2);
    });

    it("offset on page 2", () => {
      expect(pageForChunk(baseChunk({ startOffset: 150 }), doc, 300)).toBe(2);
    });

    it("offset exactly at page-3 boundary lands on page 3", () => {
      expect(pageForChunk(baseChunk({ startOffset: 200 }), doc, 300)).toBe(3);
    });

    it("offset deep into page 3", () => {
      expect(pageForChunk(baseChunk({ startOffset: 299 }), doc, 300)).toBe(3);
    });
  });

  describe("multi-page with normalization shift (proportional mapping)", () => {
    // Raw is 300 chars, normalized shrunk to 150 (50% removed by noise/dehyph).
    // A normalized offset of 75 (50% through normalized) should map to a raw
    // offset of 150 → page 2.
    const doc = parsed({
      text: "a".repeat(300),
      pageOffsets: [0, 100, 200],
    });

    it("scales the normalized offset proportionally to raw, then bins", () => {
      expect(pageForChunk(baseChunk({ startOffset: 75 }), doc, 150)).toBe(2);
    });

    it("0% of normalized → page 1", () => {
      expect(pageForChunk(baseChunk({ startOffset: 0 }), doc, 150)).toBe(1);
    });

    it("near-end of normalized (~100%) → last page", () => {
      expect(pageForChunk(baseChunk({ startOffset: 149 }), doc, 150)).toBe(3);
    });
  });

  describe("uneven page sizes (front matter shorter than body)", () => {
    // Page 1 is short (10 chars), pages 2+ are bigger.
    const doc = parsed({
      text: "a".repeat(300),
      // page1: 0-9, page2: 10-149, page3: 150-299
      pageOffsets: [0, 10, 150],
    });

    it("offset 5 → page 1 (front matter)", () => {
      expect(pageForChunk(baseChunk({ startOffset: 5 }), doc, 300)).toBe(1);
    });

    it("offset 50 → page 2 (body)", () => {
      expect(pageForChunk(baseChunk({ startOffset: 50 }), doc, 300)).toBe(2);
    });

    it("offset 200 → page 3", () => {
      expect(pageForChunk(baseChunk({ startOffset: 200 }), doc, 300)).toBe(3);
    });
  });
});
