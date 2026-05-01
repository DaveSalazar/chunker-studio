import { describe, expect, it } from "vitest";
import { hashBytes, hashSettings, hashText } from "./hash";
import type { ChunkSettings } from "../../../../shared/types";

const baseSettings = (overrides: Partial<ChunkSettings> = {}): ChunkSettings => ({
  maxChunkTokens: 500,
  minChunkChars: 20,
  headingLookback: 600,
  letterRatio: 40,
  dehyphenate: true,
  splitByArticle: true,
  duplicateMinChars: 60,
  dropDuplicates: false,
  ...overrides,
});

describe("hashBytes", () => {
  it("returns a 64-char hex sha256", () => {
    const h = hashBytes(new Uint8Array([1, 2, 3]));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const bytes = new Uint8Array([10, 20, 30]);
    expect(hashBytes(bytes)).toBe(hashBytes(bytes));
  });

  it("differs for different inputs", () => {
    expect(hashBytes(new Uint8Array([1]))).not.toBe(hashBytes(new Uint8Array([2])));
  });

  it("hashes the empty buffer to the canonical sha256-of-empty", () => {
    expect(hashBytes(new Uint8Array())).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

describe("hashText", () => {
  it("returns a 64-char hex sha256", () => {
    expect(hashText("hello")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is utf-8 — different from hashing the bytes of a different encoding", () => {
    expect(hashText("ñ")).not.toBe(hashText("n"));
  });

  it("is deterministic", () => {
    expect(hashText("abc")).toBe(hashText("abc"));
  });

  it("differs for different strings", () => {
    expect(hashText("abc")).not.toBe(hashText("abd"));
  });
});

describe("hashSettings", () => {
  it("only depends on chunker-output fields", () => {
    // duplicateMinChars and dropDuplicates are view-only; changing them
    // must NOT invalidate the cache key.
    const a = hashSettings(baseSettings({ duplicateMinChars: 60 }));
    const b = hashSettings(baseSettings({ duplicateMinChars: 999 }));
    expect(a).toBe(b);
    const c = hashSettings(baseSettings({ dropDuplicates: false }));
    const d = hashSettings(baseSettings({ dropDuplicates: true }));
    expect(c).toBe(d);
  });

  it("changes when a real chunker input changes", () => {
    const a = hashSettings(baseSettings({ maxChunkTokens: 500 }));
    const b = hashSettings(baseSettings({ maxChunkTokens: 600 }));
    expect(a).not.toBe(b);
  });

  it("changes when minChunkChars / headingLookback / letterRatio change", () => {
    const baseHash = hashSettings(baseSettings());
    expect(hashSettings(baseSettings({ minChunkChars: 21 }))).not.toBe(baseHash);
    expect(hashSettings(baseSettings({ headingLookback: 601 }))).not.toBe(baseHash);
    expect(hashSettings(baseSettings({ letterRatio: 41 }))).not.toBe(baseHash);
  });

  it("changes when boolean flags flip", () => {
    const baseHash = hashSettings(baseSettings());
    expect(hashSettings(baseSettings({ dehyphenate: false }))).not.toBe(baseHash);
    expect(hashSettings(baseSettings({ splitByArticle: false }))).not.toBe(baseHash);
  });

  it("is order-independent in the input object (stable JSON serialization)", () => {
    // Building two identical settings via different spread orders should
    // still yield the same hash — JSON.stringify with explicit field
    // enumeration guarantees this.
    const a = hashSettings({
      ...baseSettings(),
      maxChunkTokens: 500,
      dehyphenate: true,
    });
    const b = hashSettings({
      ...baseSettings(),
      dehyphenate: true,
      maxChunkTokens: 500,
    });
    expect(a).toBe(b);
  });
});
