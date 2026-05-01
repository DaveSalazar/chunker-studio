import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "./sqliteSchema";
import { prepareStatements, type SessionStatements } from "./sqliteStatements";
import { chunkParams, parsedRowToDomain, runRowToDomain } from "./sqliteMappers";
import type { SaveParseParams, SaveRunParams } from "./sqliteParams";

let db: Database.Database;
let stmts: SessionStatements;
const NOW = 1_700_000_000_000;

const parseRow = (overrides: Partial<SaveParseParams> = {}): SaveParseParams => ({
  fileHash: "h1",
  path: "/x.pdf",
  name: "x.pdf",
  extension: "pdf",
  text: "body",
  pageCount: 3,
  pageOffsetsJson: "[0,40,80]",
  warningsJson: "[]",
  unsupportedReason: null,
  accessedAt: NOW,
  ...overrides,
});

const runRow = (overrides: Partial<SaveRunParams> = {}): SaveRunParams => ({
  textHash: "t1",
  settingsHash: "s1",
  settingsJson: '{"maxChunkTokens":500}',
  totalTokens: 12,
  totalChars: 50,
  strategy: "article",
  normalizedText: "norm",
  estimatedCostUsd: 0.01,
  accessedAt: NOW,
  ...overrides,
});

beforeEach(() => {
  db = new Database(":memory:");
  migrate(db);
  stmts = prepareStatements(db);
});

describe("parsed_documents round trip", () => {
  it("save then read returns the same domain object", () => {
    stmts.saveParse.run(parseRow());
    const row = stmts.getParse.get({ fileHash: "h1" });
    const dom = parsedRowToDomain(row as Parameters<typeof parsedRowToDomain>[0]);
    expect(dom).toMatchObject({
      path: "/x.pdf",
      name: "x.pdf",
      extension: "pdf",
      text: "body",
      pageCount: 3,
      pageOffsets: [0, 40, 80],
      warnings: [],
    });
  });

  it("upserts on conflict (re-saving same fileHash overwrites)", () => {
    stmts.saveParse.run(parseRow({ text: "first" }));
    stmts.saveParse.run(parseRow({ text: "second" }));
    const row = stmts.getParse.get({ fileHash: "h1" });
    expect((row as { text: string }).text).toBe("second");
  });

  it("preserves unsupportedReason='scanned-pdf' through the round trip", () => {
    stmts.saveParse.run(parseRow({ unsupportedReason: "scanned-pdf" }));
    const row = stmts.getParse.get({ fileHash: "h1" });
    const dom = parsedRowToDomain(row as Parameters<typeof parsedRowToDomain>[0]);
    expect(dom.unsupportedReason).toBe("scanned-pdf");
  });
});

describe("chunking_runs + chunks round trip", () => {
  it("save run + chunks then read returns the full CachedChunking", () => {
    stmts.saveRun.run(runRow());
    const c = chunkParams("t1", "s1", 1, {
      index: 1,
      article: "1",
      heading: "TÍTULO",
      text: "alpha",
      charCount: 5,
      tokenCount: 2,
      startOffset: 0,
      endOffset: 5,
    });
    stmts.insertChunk.run({ ...c, manuallyEdited: 0 });

    const run = stmts.getRun.get({ textHash: "t1", settingsHash: "s1" });
    const chunks = stmts.getChunks.all({ textHash: "t1", settingsHash: "s1" });
    type RunRowType = Parameters<typeof runRowToDomain>[0];
    type ChunkRowType = Parameters<typeof runRowToDomain>[1];
    const dom = runRowToDomain(run as RunRowType, chunks as ChunkRowType);

    expect(dom.result.totalTokens).toBe(12);
    expect(dom.result.strategy).toBe("article");
    expect(dom.result.chunks).toHaveLength(1);
    expect(dom.result.chunks[0]).toMatchObject({
      index: 1,
      article: "1",
      heading: "TÍTULO",
      text: "alpha",
    });
    expect(dom.manuallyEditedIndices).toEqual([]);
  });

  it("getChunks returns rows ordered by chunk_index ASC even if inserted out of order", () => {
    stmts.saveRun.run(runRow());
    for (const i of [3, 1, 2]) {
      stmts.insertChunk.run({
        ...chunkParams("t1", "s1", i, {
          index: i,
          article: null,
          heading: null,
          text: `c${i}`,
          charCount: 2,
          tokenCount: 1,
          startOffset: 0,
          endOffset: 2,
        }),
        manuallyEdited: 0,
      });
    }
    const rows = stmts.getChunks.all({
      textHash: "t1",
      settingsHash: "s1",
    }) as { chunk_index: number }[];
    expect(rows.map((r) => r.chunk_index)).toEqual([1, 2, 3]);
  });

  it("updateChunk flips manually_edited from 0 to 1", () => {
    stmts.saveRun.run(runRow());
    const base = chunkParams("t1", "s1", 1, {
      index: 1,
      article: null,
      heading: null,
      text: "before",
      charCount: 6,
      tokenCount: 2,
      startOffset: 0,
      endOffset: 6,
    });
    stmts.insertChunk.run({ ...base, manuallyEdited: 0 });
    stmts.updateChunk.run({ ...base, text: "after" });

    const rows = stmts.getChunks.all({
      textHash: "t1",
      settingsHash: "s1",
    }) as { text: string; manually_edited: number }[];
    expect(rows[0].text).toBe("after");
    expect(rows[0].manually_edited).toBe(1);
  });

  it("deleteChunks only removes auto-generated rows (manually_edited=0)", () => {
    stmts.saveRun.run(runRow());
    for (const i of [1, 2]) {
      stmts.insertChunk.run({
        ...chunkParams("t1", "s1", i, {
          index: i,
          article: null,
          heading: null,
          text: `c${i}`,
          charCount: 2,
          tokenCount: 1,
          startOffset: 0,
          endOffset: 2,
        }),
        manuallyEdited: i === 2 ? 1 : 0,
      });
    }
    stmts.deleteChunks.run({ textHash: "t1", settingsHash: "s1" });
    const rows = stmts.getChunks.all({
      textHash: "t1",
      settingsHash: "s1",
    }) as { chunk_index: number }[];
    expect(rows.map((r) => r.chunk_index)).toEqual([2]);
  });

  it("insertChunk's WHERE manually_edited=0 guard preserves user edits on re-chunk", () => {
    stmts.saveRun.run(runRow());
    const editedKey = chunkParams("t1", "s1", 1, {
      index: 1,
      article: null,
      heading: null,
      text: "user wrote this",
      charCount: 15,
      tokenCount: 4,
      startOffset: 0,
      endOffset: 15,
    });
    stmts.insertChunk.run({ ...editedKey, manuallyEdited: 1 });
    // Auto-rechunk tries to overwrite at the same key — should be ignored.
    stmts.insertChunk.run({ ...editedKey, text: "auto-generated", manuallyEdited: 0 });
    const rows = stmts.getChunks.all({
      textHash: "t1",
      settingsHash: "s1",
    }) as { text: string; manually_edited: number }[];
    expect(rows[0].text).toBe("user wrote this");
    expect(rows[0].manually_edited).toBe(1);
  });

  it("touchRun updates accessed_at without changing other fields", () => {
    stmts.saveRun.run(runRow({ accessedAt: 100 }));
    stmts.touchRun.run({ textHash: "t1", settingsHash: "s1", accessedAt: 999 });
    const row = db
      .prepare("SELECT accessed_at, total_tokens FROM chunking_runs")
      .get() as { accessed_at: number; total_tokens: number };
    expect(row.accessed_at).toBe(999);
    expect(row.total_tokens).toBe(12);
  });

  it("FK cascade: deleting a run deletes its chunks", () => {
    db.exec("PRAGMA foreign_keys = ON");
    stmts.saveRun.run(runRow());
    stmts.insertChunk.run({
      ...chunkParams("t1", "s1", 1, {
        index: 1,
        article: null,
        heading: null,
        text: "x",
        charCount: 1,
        tokenCount: 1,
        startOffset: 0,
        endOffset: 1,
      }),
      manuallyEdited: 0,
    });
    db.prepare(
      "DELETE FROM chunking_runs WHERE text_hash = 't1' AND settings_hash = 's1'",
    ).run();
    const rows = stmts.getChunks.all({ textHash: "t1", settingsHash: "s1" });
    expect(rows).toHaveLength(0);
  });
});
