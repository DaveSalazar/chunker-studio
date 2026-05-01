import { describe, expect, it } from "vitest";
import { safeParseSettings, safeParseStringArray } from "./sqliteSerialization";

describe("safeParseStringArray", () => {
  it("returns parsed strings for valid JSON array", () => {
    expect(safeParseStringArray('["a","b","c"]')).toEqual(["a", "b", "c"]);
  });

  it("returns [] for malformed JSON", () => {
    expect(safeParseStringArray("[not json]")).toEqual([]);
  });

  it("returns [] for non-array JSON value", () => {
    expect(safeParseStringArray('"a string"')).toEqual([]);
    expect(safeParseStringArray("42")).toEqual([]);
    expect(safeParseStringArray('{"foo":1}')).toEqual([]);
  });

  it("filters out non-string entries from a mixed array", () => {
    // JSON arrays can contain numbers, nulls, objects — only strings
    // survive. Defends downstream code from unexpected types.
    expect(safeParseStringArray('["a",1,null,"b",{"x":1},"c"]')).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("returns [] for empty string input", () => {
    expect(safeParseStringArray("")).toEqual([]);
  });

  it("returns [] for empty JSON array", () => {
    expect(safeParseStringArray("[]")).toEqual([]);
  });
});

describe("safeParseSettings", () => {
  const sample = {
    maxChunkTokens: 500,
    minChunkChars: 80,
    headingLookback: 600,
    letterRatio: 40,
    dehyphenate: true,
    splitByArticle: true,
    duplicateMinChars: 60,
    dropDuplicates: false,
  };

  it("round-trips a valid serialized ChunkSettings", () => {
    expect(safeParseSettings(JSON.stringify(sample))).toEqual(sample);
  });

  it("returns the all-zeroes fallback shape on malformed JSON", () => {
    const out = safeParseSettings("[not json]");
    expect(out.maxChunkTokens).toBe(0);
    expect(out.minChunkChars).toBe(0);
    expect(out.dehyphenate).toBe(false);
    expect(out.splitByArticle).toBe(false);
    expect(out.dropDuplicates).toBe(false);
    expect(out.duplicateMinChars).toBe(0);
  });

  it("returns the fallback shape on empty input", () => {
    expect(safeParseSettings("")).toBeTruthy();
    expect(safeParseSettings("").maxChunkTokens).toBe(0);
  });

  it("the fallback covers every field on ChunkSettings", () => {
    const fallback = safeParseSettings("garbage");
    const expectedKeys = [
      "maxChunkTokens",
      "minChunkChars",
      "headingLookback",
      "letterRatio",
      "dehyphenate",
      "splitByArticle",
      "duplicateMinChars",
      "dropDuplicates",
    ];
    for (const k of expectedKeys) {
      expect(fallback).toHaveProperty(k);
    }
  });
});
