import { describe, expect, it } from "vitest";
import { clampBoundary, snapToWordBoundary } from "./chunkBoundary";

// `pointToOffset` is intentionally not covered here — it depends on
// `document.caretRangeFromPoint` which isn't trivially fakeable without
// a full DOM environment.

describe("clampBoundary", () => {
  it("returns offset unchanged when inside (min, max)", () => {
    expect(clampBoundary(50, 0, 100)).toBe(50);
  });

  it("clamps to min when offset is below", () => {
    expect(clampBoundary(-10, 0, 100)).toBe(0);
  });

  it("clamps to max when offset is above", () => {
    expect(clampBoundary(200, 0, 100)).toBe(100);
  });

  it("returns min when min == max (degenerate range)", () => {
    expect(clampBoundary(42, 50, 50)).toBe(50);
  });

  it("returns min when max < min (defensive)", () => {
    expect(clampBoundary(42, 80, 50)).toBe(80);
  });

  it("respects equality at the edges (closed interval at the bounds)", () => {
    expect(clampBoundary(0, 0, 100)).toBe(0);
    expect(clampBoundary(100, 0, 100)).toBe(100);
  });
});

describe("snapToWordBoundary", () => {
  it("returns offset unchanged when at the very start", () => {
    expect(snapToWordBoundary("hello world", 0)).toBe(0);
  });

  it("returns offset unchanged when at the very end", () => {
    const text = "hello world";
    expect(snapToWordBoundary(text, text.length)).toBe(text.length);
  });

  it("returns offset unchanged when already at a word/non-word transition", () => {
    // "hello world" — offset 5 is between 'o' (word) and ' ' (non-word).
    expect(snapToWordBoundary("hello world", 5)).toBe(5);
  });

  it("snaps left to the closer transition when both sides have one", () => {
    // "ab cdef gh" — offset 4 sits inside "cdef". Left transition at 3
    // (after the space), right transition at 7 (before the space).
    // 4-3 = 1 < 7-4 = 3 → snap left to 3.
    expect(snapToWordBoundary("ab cdef gh", 4)).toBe(3);
  });

  it("snaps right to the closer transition when both sides have one", () => {
    // "ab cdef gh" — offset 6 sits inside "cdef". Left transition 3,
    // right transition 7. 6-3 = 3 > 7-6 = 1 → snap right to 7.
    expect(snapToWordBoundary("ab cdef gh", 6)).toBe(7);
  });

  it("treats text-start as 'no transition found' and snaps right instead", () => {
    // "hello world" — there's no word-boundary on the left of "hello"
    // (text starts with a word char), so the left walk reaches index 0
    // and is marked not-found. The function returns the right side.
    expect(snapToWordBoundary("hello world", 1)).toBe(5);
  });

  it("equidistant case prefers right (strict < in the closer-side formula)", () => {
    // "ab cd ef" at offset 4: left transition at 3, right transition at 5.
    // 4-3 = 1 NOT < 5-4 = 1 → returns right.
    expect(snapToWordBoundary("ab cd ef", 4)).toBe(5);
  });

  it("returns input offset when no transition is within `window`", () => {
    // 100 'a's — no transition within a window of 5.
    const text = "a".repeat(100);
    expect(snapToWordBoundary(text, 50, 5)).toBe(50);
  });

  it("respects custom window size", () => {
    // "aaaaa aaaaa" — only transition is at index 5 (space). At offset 3,
    // a window of 10 reaches index 5 → snaps to 5. A window of 1 cannot
    // walk far enough → returns the input offset unchanged.
    const text = "aaaaa aaaaa";
    expect(snapToWordBoundary(text, 3, 10)).toBe(5);
    expect(snapToWordBoundary(text, 3, 1)).toBe(3);
  });

  it("treats unicode letters (Spanish) as word characters", () => {
    // ñ is a word char; space is a non-word char. Offset 5 sits between
    // ñ and space in "muñoz fernandez" — already a transition, no change.
    expect(snapToWordBoundary("muñoz fernandez", 5)).toBe(5);
  });

  it("treats digits and underscores as word characters", () => {
    // "abc_123 xyz" — offset 7 already between '3' (word) and ' ' (non-word).
    expect(snapToWordBoundary("abc_123 xyz", 7)).toBe(7);
  });
});
