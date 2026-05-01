import { describe, expect, it } from "vitest";
import { buildSegments } from "./chunkSegments";
import type { ChunkRecord } from "@shared/types";

const c = (overrides: Partial<ChunkRecord>): ChunkRecord => ({
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

describe("buildSegments", () => {
  it("returns [] for empty text", () => {
    expect(buildSegments("", [])).toEqual([]);
  });

  it("returns a single gap segment when there are no chunks", () => {
    const segs = buildSegments("hello world", []);
    expect(segs).toEqual([
      {
        text: "hello world",
        baseOffset: 0,
        arrayIndex: null,
        chunkIndex: null,
      },
    ]);
  });

  it("emits chunk + trailing gap for a chunk that doesn't reach the end", () => {
    const text = "hello world extra trailing";
    const chunks = [c({ index: 1, startOffset: 0, endOffset: 5 })]; // "hello"
    const segs = buildSegments(text, chunks);
    expect(segs).toEqual([
      { text: "hello", baseOffset: 0, arrayIndex: 0, chunkIndex: 1 },
      {
        text: " world extra trailing",
        baseOffset: 5,
        arrayIndex: null,
        chunkIndex: null,
      },
    ]);
  });

  it("emits gap before the first chunk", () => {
    const text = "lead-in chunk-text";
    const chunks = [c({ index: 1, startOffset: 8, endOffset: 18 })];
    const segs = buildSegments(text, chunks);
    expect(segs).toEqual([
      { text: "lead-in ", baseOffset: 0, arrayIndex: null, chunkIndex: null },
      { text: "chunk-text", baseOffset: 8, arrayIndex: 0, chunkIndex: 1 },
    ]);
  });

  it("emits gap between two non-overlapping chunks", () => {
    const text = "AAA gap BBB";
    const chunks = [
      c({ index: 1, startOffset: 0, endOffset: 3 }),
      c({ index: 2, startOffset: 8, endOffset: 11 }),
    ];
    const segs = buildSegments(text, chunks);
    expect(segs.map((s) => s.text)).toEqual(["AAA", " gap ", "BBB"]);
    expect(segs.map((s) => s.chunkIndex)).toEqual([1, null, 2]);
    expect(segs.map((s) => s.arrayIndex)).toEqual([0, null, 1]);
  });

  it("preserves caller's array index after sorting by startOffset", () => {
    // Chunks supplied OUT OF ORDER. The arrayIndex on each segment must
    // still point back at the original position so a boundary-edit
    // dispatch in the renderer hits the right chunk.
    const text = "AAA-BBB";
    const chunks = [
      c({ index: 2, startOffset: 4, endOffset: 7 }), // arrayIndex 0 (later in text)
      c({ index: 1, startOffset: 0, endOffset: 3 }), // arrayIndex 1 (earlier)
    ];
    const segs = buildSegments(text, chunks);
    // Output is in textual order, but arrayIndex points back at the
    // caller's array.
    expect(segs.map((s) => s.text)).toEqual(["AAA", "-", "BBB"]);
    expect(segs[0].arrayIndex).toBe(1); // chunk #1 was at position 1 in input
    expect(segs[2].arrayIndex).toBe(0); // chunk #2 was at position 0
  });

  it("clips overlapping chunks against the cursor", () => {
    // Chunk B starts INSIDE chunk A. Defensive: B is clipped from
    // A.endOffset onward, so segments stay contiguous and don't double
    // up on text. The leftover "9" at the end becomes a trailing gap —
    // the lossless-coverage property survives the overlap clip.
    const text = "0123456789";
    const chunks = [
      c({ index: 1, startOffset: 0, endOffset: 6 }), // 0-6: "012345"
      c({ index: 2, startOffset: 4, endOffset: 9 }), // 4-9 — overlap: clipped to 6-9
    ];
    const segs = buildSegments(text, chunks);
    expect(segs).toHaveLength(3);
    expect(segs[0].text).toBe("012345");
    expect(segs[0].chunkIndex).toBe(1);
    expect(segs[1].text).toBe("678");
    expect(segs[1].chunkIndex).toBe(2);
    expect(segs[2].text).toBe("9");
    expect(segs[2].chunkIndex).toBeNull(); // trailing gap
    expect(segs.map((s) => s.text).join("")).toBe(text);
  });

  it("trims a chunk that extends past the text length", () => {
    // endOffset > text.length should clip to text.length.
    const text = "short";
    const chunks = [c({ index: 1, startOffset: 0, endOffset: 9999 })];
    const segs = buildSegments(text, chunks);
    expect(segs).toEqual([
      { text: "short", baseOffset: 0, arrayIndex: 0, chunkIndex: 1 },
    ]);
  });

  it("baseOffset of segments is monotonically non-decreasing", () => {
    const text = "x".repeat(50);
    const chunks = [
      c({ index: 1, startOffset: 5, endOffset: 15 }),
      c({ index: 2, startOffset: 20, endOffset: 30 }),
      c({ index: 3, startOffset: 35, endOffset: 45 }),
    ];
    const segs = buildSegments(text, chunks);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].baseOffset).toBeGreaterThanOrEqual(segs[i - 1].baseOffset);
    }
  });

  it("concatenated segment text equals the source text (lossless coverage)", () => {
    const text = "alpha bravo charlie delta echo";
    const chunks = [
      c({ index: 1, startOffset: 0, endOffset: 5 }),
      c({ index: 2, startOffset: 12, endOffset: 19 }),
      c({ index: 3, startOffset: 26, endOffset: 30 }),
    ];
    const segs = buildSegments(text, chunks);
    expect(segs.map((s) => s.text).join("")).toBe(text);
  });
});
