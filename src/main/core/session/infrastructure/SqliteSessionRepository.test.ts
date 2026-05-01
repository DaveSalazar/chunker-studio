import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ChunkRecord,
  ChunkSettings,
  ChunkingResult,
  ParsedDocument,
} from "../../../../shared/types";

// Stub electron's `app.getPath("userData")` to a per-test tmp dir.
// The repo opens a real `session.db` inside that dir, so the test
// exercises the full migration + statement-prepare lifecycle.
let tmpRoot = "";
vi.mock("electron", () => ({
  app: { getPath: () => tmpRoot },
}));

import { SqliteSessionRepository } from "./SqliteSessionRepository";

const settings: ChunkSettings = {
  maxChunkTokens: 500,
  minChunkChars: 20,
  headingLookback: 600,
  letterRatio: 40,
  dehyphenate: true,
  splitByArticle: true,
  duplicateMinChars: 60,
  dropDuplicates: false,
};

const chunk = (overrides: Partial<ChunkRecord> = {}): ChunkRecord => ({
  index: 1,
  article: null,
  heading: null,
  text: "x",
  charCount: 1,
  tokenCount: 1,
  startOffset: 0,
  endOffset: 1,
  ...overrides,
});

const result = (chunks: ChunkRecord[]): ChunkingResult => ({
  chunks,
  totalTokens: chunks.reduce((s, c) => s + c.tokenCount, 0),
  totalChars: chunks.reduce((s, c) => s + c.charCount, 0),
  strategy: "article",
  normalizedText: "norm",
  estimatedCostUsd: 0,
});

const parsed = (overrides: Partial<ParsedDocument> = {}): ParsedDocument => ({
  path: "/x.pdf",
  name: "x.pdf",
  extension: "pdf",
  text: "body",
  warnings: [],
  ...overrides,
});

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "ses-"));
});
afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("SqliteSessionRepository — parsed cache", () => {
  it("returns null for a fileHash that has not been saved", async () => {
    const repo = new SqliteSessionRepository();
    expect(await repo.getCachedParse("missing")).toBeNull();
  });

  it("round-trips a ParsedDocument through saveCachedParse → getCachedParse", async () => {
    const repo = new SqliteSessionRepository();
    await repo.saveCachedParse(
      "h1",
      parsed({ pageCount: 5, pageOffsets: [0, 100], warnings: ["w1"] }),
    );
    const cached = await repo.getCachedParse("h1");
    expect(cached?.parsed).toMatchObject({
      path: "/x.pdf",
      pageCount: 5,
      pageOffsets: [0, 100],
      warnings: ["w1"],
    });
  });

  it("preserves unsupportedReason='scanned-pdf'", async () => {
    const repo = new SqliteSessionRepository();
    await repo.saveCachedParse("h1", parsed({ unsupportedReason: "scanned-pdf" }));
    const cached = await repo.getCachedParse("h1");
    expect(cached?.parsed.unsupportedReason).toBe("scanned-pdf");
  });

  it("upserts on conflict (re-saving same fileHash overwrites)", async () => {
    const repo = new SqliteSessionRepository();
    await repo.saveCachedParse("h1", parsed({ text: "first" }));
    await repo.saveCachedParse("h1", parsed({ text: "second" }));
    const cached = await repo.getCachedParse("h1");
    expect(cached?.parsed.text).toBe("second");
  });
});

describe("SqliteSessionRepository — chunking cache", () => {
  it("returns null for a (textHash, settingsHash) that has not been saved", async () => {
    const repo = new SqliteSessionRepository();
    expect(await repo.getCachedChunking("t", "s")).toBeNull();
  });

  it("returns null when the run row exists but has zero chunks", async () => {
    const repo = new SqliteSessionRepository();
    await repo.saveCachedChunking("t", "s", settings, result([]));
    expect(await repo.getCachedChunking("t", "s")).toBeNull();
  });

  it("round-trips a ChunkingResult", async () => {
    const repo = new SqliteSessionRepository();
    const chunks = [chunk({ index: 1, text: "a" }), chunk({ index: 2, text: "b" })];
    await repo.saveCachedChunking("t", "s", settings, result(chunks));
    const cached = await repo.getCachedChunking("t", "s");
    expect(cached?.result.chunks).toHaveLength(2);
    expect(cached?.result.chunks[0].text).toBe("a");
    expect(cached?.manuallyEditedIndices).toEqual([]);
  });

  it("re-running with the same settings drops auto chunks but keeps manual edits", async () => {
    const repo = new SqliteSessionRepository();
    await repo.saveCachedChunking("t", "s", settings, result([
      chunk({ index: 1, text: "auto1" }),
      chunk({ index: 2, text: "auto2" }),
    ]));
    // User edits chunk 1 via the boundary-drag flow.
    await repo.saveManualBoundaryEdit(
      "t",
      "s",
      1,
      chunk({ index: 1, text: "manual-left" }),
      chunk({ index: 2, text: "manual-right" }),
    );
    // Now re-run the chunker — old auto rows are dropped, but manual rows survive.
    await repo.saveCachedChunking("t", "s", settings, result([
      chunk({ index: 3, text: "auto3" }),
    ]));
    const cached = await repo.getCachedChunking("t", "s");
    const texts = cached?.result.chunks.map((c) => c.text);
    expect(texts).toContain("manual-left");
    expect(texts).toContain("manual-right");
    expect(texts).toContain("auto3");
    expect(texts).not.toContain("auto1");
    expect(cached?.manuallyEditedIndices).toEqual([1, 2]);
  });
});

describe("SqliteSessionRepository — saveManualBoundaryEdit", () => {
  it("flags both chunks as manually_edited and updates their text", async () => {
    const repo = new SqliteSessionRepository();
    await repo.saveCachedChunking("t", "s", settings, result([
      chunk({ index: 1, text: "auto1" }),
      chunk({ index: 2, text: "auto2" }),
    ]));
    await repo.saveManualBoundaryEdit(
      "t",
      "s",
      1,
      chunk({ index: 1, text: "EDITED-LEFT" }),
      chunk({ index: 2, text: "EDITED-RIGHT" }),
    );
    const cached = await repo.getCachedChunking("t", "s");
    expect(cached?.manuallyEditedIndices).toEqual([1, 2]);
    const byIndex = new Map(cached!.result.chunks.map((c) => [c.index, c.text]));
    expect(byIndex.get(1)).toBe("EDITED-LEFT");
    expect(byIndex.get(2)).toBe("EDITED-RIGHT");
  });
});
