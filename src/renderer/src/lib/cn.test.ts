import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("returns the empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("joins simple class strings with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values (false, null, undefined, '')", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("respects conditional object syntax (clsx)", () => {
    expect(cn("base", { hidden: true, italic: false })).toBe("base hidden");
  });

  it("flattens nested arrays", () => {
    expect(cn(["a", ["b", "c"]])).toBe("a b c");
  });

  it("dedupes conflicting Tailwind utilities (twMerge): later wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("keeps non-conflicting Tailwind utilities side-by-side", () => {
    expect(cn("p-2", "m-4")).toBe("p-2 m-4");
  });
});
