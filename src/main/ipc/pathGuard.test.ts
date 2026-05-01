import { describe, expect, it } from "vitest";
import { assertSafePath } from "./pathGuard";

describe("assertSafePath", () => {
  describe("type / shape rejections", () => {
    it("rejects non-string input", () => {
      expect(() => assertSafePath(undefined)).toThrow(/Invalid path/);
      expect(() => assertSafePath(null)).toThrow(/Invalid path/);
      expect(() => assertSafePath(42)).toThrow(/Invalid path/);
      expect(() => assertSafePath({})).toThrow(/Invalid path/);
      expect(() => assertSafePath(["/foo"])).toThrow(/Invalid path/);
    });

    it("rejects empty string", () => {
      expect(() => assertSafePath("")).toThrow(/Invalid path/);
    });

    it("uses the supplied label in the error message", () => {
      expect(() => assertSafePath("", "folder path")).toThrow(/Invalid folder path/);
    });
  });

  describe("absolute-path enforcement", () => {
    it("rejects relative paths", () => {
      expect(() => assertSafePath("foo/bar.pdf")).toThrow(/absolute/);
      expect(() => assertSafePath("./relative.pdf")).toThrow(/absolute/);
      expect(() => assertSafePath("../escape.pdf")).toThrow(/absolute/);
    });

    it("accepts a POSIX absolute path", () => {
      expect(() => assertSafePath("/Users/alice/doc.pdf")).not.toThrow();
    });

    it("returns the path on success", () => {
      // On POSIX, path is unchanged. On Windows it'd be normalised.
      expect(assertSafePath("/Users/alice/doc.pdf")).toBe(
        process.platform === "win32"
          ? "\\Users\\alice\\doc.pdf"
          : "/Users/alice/doc.pdf",
      );
    });
  });

  describe("traversal / escape attempts", () => {
    it("rejects '..' as a path segment", () => {
      expect(() => assertSafePath("/Users/alice/../bob/secret")).toThrow(
        /'\.\.'/,
      );
    });

    it("rejects a Windows-style traversal path on every platform", () => {
      // On Windows: rejected by the `..`-segment check.
      // On POSIX: rejected by `isAbsolute` first (backslash isn't a
      // separator), so the message differs — but the *security
      // property* (rejection) holds either way, which is what matters.
      expect(() => assertSafePath("C:\\Users\\alice\\..\\bob")).toThrow();
    });

    it("does NOT reject a literal `..` embedded inside a name", () => {
      // Filenames like "weird..name.pdf" are legal — `..` is only a
      // problem when it sits as its own segment between separators.
      expect(() => assertSafePath("/Users/alice/weird..name.pdf")).not.toThrow();
    });
  });

  describe("null-byte rejection", () => {
    it("rejects an embedded null byte", () => {
      expect(() => assertSafePath("/Users/alice\0/etc/passwd")).toThrow(/null byte/);
    });
  });

  describe("Windows-style separators", () => {
    it("accepts a Windows-style absolute path", () => {
      // node:path's `isAbsolute` accepts `C:\...` on Windows;
      // on POSIX it returns false. We assert per-platform.
      const fn = () => assertSafePath("C:\\Users\\alice\\doc.pdf");
      if (process.platform === "win32") {
        expect(fn).not.toThrow();
      } else {
        expect(fn).toThrow(/absolute/);
      }
    });
  });
});
