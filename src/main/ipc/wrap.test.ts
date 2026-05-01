import { describe, expect, it } from "vitest";
import { wrap } from "./wrap";

describe("wrap", () => {
  it("wraps a successful synchronous return into { ok: true, value }", async () => {
    const result = await wrap(() => 42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("wraps a successful async return", async () => {
    const result = await wrap(async () => "hello");
    expect(result).toEqual({ ok: true, value: "hello" });
  });

  it("converts a thrown Error into { ok: false, error: message }", async () => {
    const result = await wrap(() => {
      throw new Error("kaboom");
    });
    expect(result).toEqual({ ok: false, error: "kaboom" });
  });

  it("converts a rejected promise into the failure envelope", async () => {
    const result = await wrap(async () => {
      throw new Error("async kaboom");
    });
    expect(result).toEqual({ ok: false, error: "async kaboom" });
  });

  it("stringifies non-Error throwables", async () => {
    const result = await wrap(() => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "raw string failure";
    });
    expect(result).toEqual({ ok: false, error: "raw string failure" });
  });

  it("stringifies a thrown number", async () => {
    const result = await wrap(() => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw 404;
    });
    expect(result).toEqual({ ok: false, error: "404" });
  });

  it("truncates absurdly long error messages to keep the IPC payload sane", async () => {
    const huge = "x".repeat(10_000);
    const result = await wrap(() => {
      throw new Error(huge);
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // 500 chars + ellipsis
      expect(result.error.length).toBeLessThanOrEqual(501);
      expect(result.error.endsWith("…")).toBe(true);
    }
  });

  it("preserves an error that is shorter than the cap (no truncation)", async () => {
    const result = await wrap(() => {
      throw new Error("short message");
    });
    expect(result).toEqual({ ok: false, error: "short message" });
  });
});
