import { describe, expect, it } from "vitest";
import { applyDedup, findDuplicateGroups } from "./duplicateChunks";
import type { ChunkRecord, ChunkingResult } from "@shared/types";

const chunk = (overrides: Partial<ChunkRecord>): ChunkRecord => ({
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

describe("findDuplicateGroups", () => {
  it("returns empty Map for empty input", () => {
    expect(findDuplicateGroups([], 30).size).toBe(0);
  });

  it("returns empty Map when minChars <= 0 (feature disabled)", () => {
    const chunks = [
      chunk({ index: 1, text: "hello world hello world" }),
      chunk({ index: 2, text: "hello world hello world" }),
    ];
    expect(findDuplicateGroups(chunks, 0).size).toBe(0);
    expect(findDuplicateGroups(chunks, -5).size).toBe(0);
  });

  it("does not flag unique chunks", () => {
    const chunks = [
      chunk({ index: 1, text: "alpha beta gamma delta epsilon" }),
      chunk({ index: 2, text: "different text completely here ok" }),
    ];
    expect(findDuplicateGroups(chunks, 10).size).toBe(0);
  });

  it("flags exact duplicates of length >= minChars", () => {
    const dupText = "this header repeats across pages exactly";
    const chunks = [
      chunk({ index: 1, text: dupText }),
      chunk({ index: 2, text: dupText }),
    ];
    const result = findDuplicateGroups(chunks, 10);
    expect(result.size).toBe(2);
    expect(result.get(1)?.count).toBe(2);
    expect(result.get(2)?.count).toBe(2);
    // Same group id for both members.
    expect(result.get(1)?.groupId).toBe(result.get(2)?.groupId);
  });

  it("normalizes whitespace + case before comparing", () => {
    const chunks = [
      chunk({ index: 1, text: "Hello   World\n\tFoo Bar" }),
      chunk({ index: 2, text: "hello world foo bar" }),
    ];
    const result = findDuplicateGroups(chunks, 5);
    expect(result.size).toBe(2);
    expect(result.get(1)?.groupId).toBe(result.get(2)?.groupId);
  });

  it("counts a 3-chunk duplicate group correctly", () => {
    const t = "repeated boilerplate text segment xyz";
    const chunks = [
      chunk({ index: 10, text: t }),
      chunk({ index: 11, text: t }),
      chunk({ index: 12, text: t }),
    ];
    const result = findDuplicateGroups(chunks, 10);
    expect(result.size).toBe(3);
    for (const idx of [10, 11, 12]) {
      expect(result.get(idx)?.count).toBe(3);
    }
  });

  it("excludes a duplicate whose normalized length is below minChars", () => {
    const chunks = [
      chunk({ index: 1, text: "short" }),
      chunk({ index: 2, text: "short" }),
    ];
    expect(findDuplicateGroups(chunks, 10).size).toBe(0);
  });

  it("treats two singleton groups as non-duplicates", () => {
    const chunks = [
      chunk({ index: 1, text: "unique alpha here lots of letters" }),
      chunk({ index: 2, text: "unique beta different chunk text" }),
      chunk({ index: 3, text: "unique alpha here lots of letters" }),
    ];
    const result = findDuplicateGroups(chunks, 10);
    expect(result.size).toBe(2);
    expect(result.has(1)).toBe(true);
    expect(result.has(3)).toBe(true);
    expect(result.has(2)).toBe(false);
  });

  it("assigns distinct group ids to distinct dup groups", () => {
    const t1 = "first repeated text alpha alpha alpha";
    const t2 = "second repeated text beta beta beta";
    const chunks = [
      chunk({ index: 1, text: t1 }),
      chunk({ index: 2, text: t2 }),
      chunk({ index: 3, text: t1 }),
      chunk({ index: 4, text: t2 }),
    ];
    const result = findDuplicateGroups(chunks, 10);
    expect(result.size).toBe(4);
    expect(result.get(1)?.groupId).toBe(result.get(3)?.groupId);
    expect(result.get(2)?.groupId).toBe(result.get(4)?.groupId);
    expect(result.get(1)?.groupId).not.toBe(result.get(2)?.groupId);
  });

  it("returns the same answer on a second call with the same chunk objects (WeakMap cache hit)", () => {
    // Indirect cache test: identical inputs must produce identical
    // outputs. The WeakMap is an optimization, not a behavior change.
    const chunks = [
      chunk({ index: 1, text: "repeating block of normalized text" }),
      chunk({ index: 2, text: "repeating block of normalized text" }),
    ];
    const a = findDuplicateGroups(chunks, 10);
    const b = findDuplicateGroups(chunks, 10);
    expect(a.size).toBe(b.size);
    expect(a.get(1)?.count).toBe(b.get(1)?.count);
  });
});

const baseResult = (chunks: ChunkRecord[]): ChunkingResult => ({
  chunks,
  totalTokens: chunks.reduce((s, c) => s + c.tokenCount, 0),
  totalChars: chunks.reduce((s, c) => s + c.charCount, 0),
  strategy: "article",
  normalizedText: "",
  estimatedCostUsd: 0.001 * chunks.reduce((s, c) => s + c.tokenCount, 0),
});

describe("applyDedup", () => {
  it("returns null when result is null", () => {
    expect(applyDedup(null, new Map(), true)).toBeNull();
  });

  it("returns the original result when drop is false", () => {
    const r = baseResult([chunk({ index: 1, tokenCount: 10 })]);
    expect(applyDedup(r, new Map([[1, { groupId: 0, count: 2 }]]), false)).toBe(
      r,
    );
  });

  it("returns the original result when info map is empty", () => {
    const r = baseResult([chunk({ index: 1 })]);
    expect(applyDedup(r, new Map(), true)).toBe(r);
  });

  it("keeps the first occurrence of each duplicate group, drops the rest", () => {
    const a = chunk({ index: 1, text: "dup", tokenCount: 10, charCount: 30 });
    const b = chunk({ index: 2, text: "uniq", tokenCount: 5, charCount: 15 });
    const c = chunk({ index: 3, text: "dup", tokenCount: 10, charCount: 30 });
    const result = baseResult([a, b, c]);
    const info = new Map([
      [1, { groupId: 0, count: 2 }],
      [3, { groupId: 0, count: 2 }],
    ]);
    const out = applyDedup(result, info, true);
    expect(out).not.toBeNull();
    expect(out!.chunks).toEqual([a, b]);
  });

  it("recomputes totalTokens/totalChars from the kept chunks", () => {
    const a = chunk({ index: 1, text: "dup", tokenCount: 10, charCount: 30 });
    const b = chunk({ index: 2, text: "uniq", tokenCount: 5, charCount: 15 });
    const c = chunk({ index: 3, text: "dup", tokenCount: 10, charCount: 30 });
    const result = baseResult([a, b, c]); // totals: 25 tokens, 75 chars
    const info = new Map([
      [1, { groupId: 0, count: 2 }],
      [3, { groupId: 0, count: 2 }],
    ]);
    const out = applyDedup(result, info, true)!;
    expect(out.totalTokens).toBe(15);
    expect(out.totalChars).toBe(45);
  });

  it("scales estimatedCostUsd proportionally", () => {
    const a = chunk({ index: 1, text: "dup", tokenCount: 100 });
    const c = chunk({ index: 3, text: "dup", tokenCount: 100 });
    const r: ChunkingResult = {
      chunks: [a, c],
      totalTokens: 200,
      totalChars: 0,
      strategy: "article",
      normalizedText: "",
      estimatedCostUsd: 0.4,
    };
    const info = new Map([
      [1, { groupId: 0, count: 2 }],
      [3, { groupId: 0, count: 2 }],
    ]);
    const out = applyDedup(r, info, true)!;
    // Drop chunk 3 → kept tokens 100 / 200 = 0.5 → cost 0.4 * 0.5 = 0.2
    expect(out.totalTokens).toBe(100);
    expect(out.estimatedCostUsd).toBeCloseTo(0.2);
  });

  it("returns the same reference when nothing was dropped", () => {
    // No chunk in `info` matches the result's chunks → kept-length === input-length → return as-is.
    const a = chunk({ index: 1 });
    const b = chunk({ index: 2 });
    const r = baseResult([a, b]);
    const info = new Map([[99, { groupId: 0, count: 2 }]]);
    expect(applyDedup(r, info, true)).toBe(r);
  });

  it("handles a 3-chunk dup group (keeps first, drops two)", () => {
    const a = chunk({ index: 1, text: "rep", tokenCount: 5 });
    const b = chunk({ index: 2, text: "rep", tokenCount: 5 });
    const c = chunk({ index: 3, text: "rep", tokenCount: 5 });
    const r = baseResult([a, b, c]);
    const info = new Map([
      [1, { groupId: 0, count: 3 }],
      [2, { groupId: 0, count: 3 }],
      [3, { groupId: 0, count: 3 }],
    ]);
    const out = applyDedup(r, info, true)!;
    expect(out.chunks).toEqual([a]);
    expect(out.totalTokens).toBe(5);
  });
});
