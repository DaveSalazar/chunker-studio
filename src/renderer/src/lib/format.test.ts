import { describe, expect, it } from "vitest";
import { extensionOf, formatBytes } from "./format";

describe("formatBytes", () => {
  describe("non-positive / non-finite inputs degrade to 0 B", () => {
    it("returns '0 B' for zero", () => {
      expect(formatBytes(0)).toBe("0 B");
    });
    it("returns '0 B' for negative", () => {
      expect(formatBytes(-1024)).toBe("0 B");
    });
    it("returns '0 B' for NaN", () => {
      expect(formatBytes(Number.NaN)).toBe("0 B");
    });
    it("returns '0 B' for Infinity", () => {
      expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0 B");
    });
  });

  describe("byte range (no decimal)", () => {
    it("1 byte → '1 B'", () => {
      expect(formatBytes(1)).toBe("1 B");
    });
    it("100 bytes → '100 B'", () => {
      expect(formatBytes(100)).toBe("100 B");
    });
    it("1023 bytes stays in B (just below 1 KB)", () => {
      expect(formatBytes(1023)).toBe("1023 B");
    });
  });

  describe("KB / MB / GB scaling", () => {
    it("exactly 1 KiB rounds to '1.0 KB' (one decimal under 10)", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
    });
    it("1 MiB → '1.0 MB'", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    });
    it("1 GiB → '1.0 GB'", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
    });
    it("≥10 in unit drops the decimal (e.g. 50 KB)", () => {
      expect(formatBytes(50 * 1024)).toBe("50 KB");
    });
    it("rounds 1.5x up at one decimal", () => {
      // 1536 / 1024 = 1.5 → toFixed(1) = "1.5"
      expect(formatBytes(1536)).toBe("1.5 KB");
    });
  });

  describe("clamps to GB beyond TB", () => {
    it("1 TiB shows as 1024 GB (no TB unit defined)", () => {
      expect(formatBytes(1024 ** 4)).toBe("1024 GB");
    });
  });
});

describe("extensionOf", () => {
  it("returns the lower-cased extension after the last dot", () => {
    expect(extensionOf("doc.pdf")).toBe("pdf");
  });

  it("lower-cases an upper-case extension", () => {
    expect(extensionOf("DOC.PDF")).toBe("pdf");
  });

  it("uses the LAST dot for compound extensions", () => {
    expect(extensionOf("archive.tar.gz")).toBe("gz");
  });

  it("returns '' when there is no dot", () => {
    expect(extensionOf("noext")).toBe("");
  });

  it("returns '' for an empty string", () => {
    expect(extensionOf("")).toBe("");
  });

  it("returns '' when the dot is the last character", () => {
    // Trailing dot — split returns "", which is falsy and counts as "no extension".
    expect(extensionOf("file.")).toBe("");
  });

  it("preserves a path-style filename's last segment dot logic", () => {
    expect(extensionOf("/home/user/my.file.PDF")).toBe("pdf");
  });
});
