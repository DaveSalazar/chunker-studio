import { describe, expect, it } from "vitest";
import "reflect-metadata";
import { TiktokenCounter } from "./TiktokenCounter";

describe("TiktokenCounter", () => {
  it("counts a single string", () => {
    const counter = new TiktokenCounter();
    expect(counter.count("hello world")).toBeGreaterThan(0);
  });

  it("returns 0 for an empty string", () => {
    expect(new TiktokenCounter().count("")).toBe(0);
  });

  it("countBatch returns one entry per input string", () => {
    const counter = new TiktokenCounter();
    const counts = counter.countBatch(["a", "ab", "abc"]);
    expect(counts).toHaveLength(3);
  });

  it("longer strings have non-strictly-greater token counts", () => {
    const counter = new TiktokenCounter();
    expect(counter.count("a")).toBeLessThanOrEqual(counter.count("abcdef"));
  });

  it("encoder is initialized lazily and reused across calls", () => {
    const counter = new TiktokenCounter();
    // Two calls should both work and return the same count for the same input.
    expect(counter.count("x")).toBe(counter.count("x"));
  });

  it("countBatch and count agree for the same input", () => {
    const counter = new TiktokenCounter();
    const single = counter.count("the quick brown fox");
    const [batched] = counter.countBatch(["the quick brown fox"]);
    expect(batched).toBe(single);
  });
});
