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

// Stub `app.getPath("userData")` so the repo opens a real session.db
// inside an isolated tmp dir per test (matches SqliteSessionRepository.test.ts).
let tmpRoot = "";
vi.mock("electron", () => ({
  app: { getPath: () => tmpRoot },
}));

import { SqliteSessionRepository } from "../infrastructure/SqliteSessionRepository";
import { GetSessionCacheStatsUseCase } from "./GetSessionCacheStatsUseCase";
import { ClearSessionCacheUseCase } from "./ClearSessionCacheUseCase";

const settings: ChunkSettings = {
  maxChunkTokens: 500,
  minChunkChars: 20,
  headingLookback: 600,
  letterRatio: 40,
  dehyphenate: true,
  splitByArticle: true,
  chunkingStrategy: "articleAware",
  normalizePlaceholders: false,
  duplicateMinChars: 60,
  dropDuplicates: false,
};

const chunk = (overrides: Partial<ChunkRecord> = {}): ChunkRecord => ({
  index: 1,
  article: null,
  heading: null,
  text: "x",
  body: null,
  charCount: 1,
  tokenCount: 1,
  startOffset: 0,
  endOffset: 1,
  ...overrides,
});

const result = (chunks: ChunkRecord[]): ChunkingResult => ({
  chunks,
  totalTokens: chunks.length,
  totalChars: chunks.length,
  strategy: "article",
  normalizedText: "norm",
  estimatedCostUsd: 0,
});

const parsed: ParsedDocument = {
  path: "/x.pdf",
  name: "x.pdf",
  extension: "pdf",
  text: "body",
  warnings: [],
};

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "ses-clear-"));
});
afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("GetSessionCacheStatsUseCase", () => {
  it("returns zeros on a fresh DB", async () => {
    const repo = new SqliteSessionRepository();
    const stats = await new GetSessionCacheStatsUseCase(repo).execute();
    expect(stats).toEqual({
      parsedDocuments: 0,
      chunkingRuns: 0,
      chunks: 0,
      manuallyEditedChunks: 0,
    });
  });

  it("counts parses, runs, and chunks (including manual edits separately)", async () => {
    const repo = new SqliteSessionRepository();
    await repo.saveCachedParse("h1", parsed);
    await repo.saveCachedParse("h2", parsed);
    await repo.saveCachedChunking(
      "t",
      "s",
      settings,
      result([chunk({ index: 0 }), chunk({ index: 1 })]),
    );
    // Promote chunk index 0 to manually-edited via the boundary edit path.
    await repo.saveManualBoundaryEdit(
      "t",
      "s",
      0,
      chunk({ index: 0, text: "L" }),
      chunk({ index: 1, text: "R" }),
    );

    const stats = await new GetSessionCacheStatsUseCase(repo).execute();
    expect(stats).toEqual({
      parsedDocuments: 2,
      chunkingRuns: 1,
      chunks: 2,
      manuallyEditedChunks: 2,
    });
  });
});

describe("ClearSessionCacheUseCase", () => {
  it("wipes parses, runs, and chunks (manual edits included)", async () => {
    const repo = new SqliteSessionRepository();
    await repo.saveCachedParse("h1", parsed);
    await repo.saveCachedChunking("t", "s", settings, result([chunk({ index: 0 })]));
    await repo.saveManualBoundaryEdit(
      "t",
      "s",
      0,
      chunk({ index: 0, text: "L" }),
      chunk({ index: 1, text: "R" }),
    );

    await new ClearSessionCacheUseCase(repo).execute();

    expect(await repo.getCachedParse("h1")).toBeNull();
    expect(await repo.getCachedChunking("t", "s")).toBeNull();
    expect(await repo.getStats()).toEqual({
      parsedDocuments: 0,
      chunkingRuns: 0,
      chunks: 0,
      manuallyEditedChunks: 0,
    });
  });

  it("is idempotent — clearing an already-empty DB succeeds", async () => {
    const repo = new SqliteSessionRepository();
    await new ClearSessionCacheUseCase(repo).execute();
    await new ClearSessionCacheUseCase(repo).execute();
    expect((await repo.getStats()).parsedDocuments).toBe(0);
  });

  it("survives subsequent writes — schema is preserved", async () => {
    const repo = new SqliteSessionRepository();
    await repo.saveCachedParse("h1", parsed);
    await new ClearSessionCacheUseCase(repo).execute();
    await repo.saveCachedParse("h2", parsed);
    expect(await repo.getCachedParse("h2")).not.toBeNull();
  });
});
