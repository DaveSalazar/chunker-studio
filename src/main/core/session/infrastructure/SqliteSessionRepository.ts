import { app } from "electron";
import Database from "better-sqlite3";
import type { Database as DatabaseInstance } from "better-sqlite3";
import { join } from "path";
import { injectable } from "inversify";
import type {
  ChunkRecord,
  ChunkSettings,
  ChunkingResult,
  ParsedDocument,
} from "../../../../shared/types";
import type {
  CachedChunking,
  CachedParse,
  SessionRepository,
} from "../domain/SessionRepository";
import { migrate } from "./sqliteSchema";
import {
  prepareStatements,
  type ChunkRow,
  type ParsedRow,
  type RunRow,
  type SessionStatements,
} from "./sqliteStatements";
import { chunkParams, parsedRowToDomain, runRowToDomain } from "./sqliteMappers";

const FILENAME = "session.db";

/**
 * Caches parsed documents and chunking runs in a per-user SQLite file.
 * Schema, prepared statements, row mappers, and serialization helpers
 * live in sibling modules; this class is the public port and the
 * lifecycle holder for the DB handle + statement bundle.
 */
@injectable()
export class SqliteSessionRepository implements SessionRepository {
  private db: DatabaseInstance | null = null;
  private statements: SessionStatements | null = null;

  private ensureOpen(): SessionStatements {
    if (this.statements) return this.statements;
    const filePath = join(app.getPath("userData"), FILENAME);
    const db = new Database(filePath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    this.db = db;
    this.statements = prepareStatements(db);
    return this.statements;
  }

  async getCachedParse(fileHash: string): Promise<CachedParse | null> {
    const stmts = this.ensureOpen();
    const row = stmts.getParse.get(fileHash) as ParsedRow | undefined;
    return row ? { parsed: parsedRowToDomain(row) } : null;
  }

  async saveCachedParse(fileHash: string, parsed: ParsedDocument): Promise<void> {
    const stmts = this.ensureOpen();
    stmts.saveParse.run(
      fileHash,
      parsed.path,
      parsed.name,
      parsed.extension,
      parsed.text,
      parsed.pageCount ?? null,
      JSON.stringify(parsed.warnings ?? []),
      parsed.unsupportedReason ?? null,
      Date.now(),
    );
  }

  async getCachedChunking(
    textHash: string,
    settingsHash: string,
  ): Promise<CachedChunking | null> {
    const stmts = this.ensureOpen();
    const run = stmts.getRun.get(textHash, settingsHash) as RunRow | undefined;
    if (!run) return null;
    const chunkRows = stmts.getChunks.all(textHash, settingsHash) as ChunkRow[];
    if (chunkRows.length === 0) return null;
    stmts.touchRun.run(Date.now(), textHash, settingsHash);
    return runRowToDomain(run, chunkRows);
  }

  async saveCachedChunking(
    textHash: string,
    settingsHash: string,
    settings: ChunkSettings,
    result: ChunkingResult,
  ): Promise<void> {
    const stmts = this.ensureOpen();
    const db = this.db!;
    const tx = db.transaction(() => {
      stmts.saveRun.run({
        textHash,
        settingsHash,
        settingsJson: JSON.stringify(settings),
        totalTokens: result.totalTokens,
        totalChars: result.totalChars,
        strategy: result.strategy,
        normalizedText: result.normalizedText,
        estimatedCostUsd: result.estimatedCostUsd,
        accessedAt: Date.now(),
      });
      // Drop auto-generated chunks; keep manual edits intact so a re-run
      // with the same settings preserves user-edited boundaries.
      stmts.deleteChunks.run(textHash, settingsHash);
      for (const chunk of result.chunks) {
        stmts.insertChunk.run({
          ...chunkParams(textHash, settingsHash, chunk.index, chunk),
          manuallyEdited: 0,
        });
      }
    });
    tx();
  }

  async saveManualBoundaryEdit(
    textHash: string,
    settingsHash: string,
    leftIndex: number,
    leftChunk: ChunkRecord,
    rightChunk: ChunkRecord,
  ): Promise<void> {
    const stmts = this.ensureOpen();
    const db = this.db!;
    const tx = db.transaction(() => {
      stmts.touchRun.run(Date.now(), textHash, settingsHash);
      stmts.updateChunk.run(chunkParams(textHash, settingsHash, leftIndex, leftChunk));
      stmts.updateChunk.run(chunkParams(textHash, settingsHash, leftIndex + 1, rightChunk));
    });
    tx();
  }
}
