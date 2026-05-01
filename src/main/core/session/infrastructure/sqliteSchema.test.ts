import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "./sqliteSchema";

interface ColumnInfo {
  name: string;
  type: string;
}

interface VersionRow {
  value: number;
}

const tableHas = (db: Database.Database, table: string, column: string): boolean => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
  return cols.some((c) => c.name === column);
};

const schemaVersion = (db: Database.Database): number => {
  const row = db
    .prepare("SELECT value FROM schema_meta WHERE key = 'version'")
    .get() as VersionRow | undefined;
  return row?.value ?? 0;
};

describe("migrate (schema)", () => {
  it("creates all three tables on a fresh DB", () => {
    const db = new Database(":memory:");
    migrate(db);
    const tables = (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[]
    ).map((t) => t.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        "schema_meta",
        "parsed_documents",
        "chunking_runs",
        "chunks",
      ]),
    );
  });

  it("stamps schema_meta version = 3 on a fresh DB", () => {
    const db = new Database(":memory:");
    migrate(db);
    expect(schemaVersion(db)).toBe(3);
  });

  it("includes the v3 columns on a fresh DB (no separate ALTER needed)", () => {
    const db = new Database(":memory:");
    migrate(db);
    expect(tableHas(db, "parsed_documents", "unsupported_reason")).toBe(true);
    expect(tableHas(db, "parsed_documents", "page_offsets_json")).toBe(true);
  });

  it("is idempotent — running twice produces the same state", () => {
    const db = new Database(":memory:");
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
    expect(schemaVersion(db)).toBe(3);
  });

  it("migrates a v1 DB up to v3 (adds unsupported_reason and page_offsets_json)", () => {
    // Simulate a pre-v2 DB without the v2/v3 columns by creating
    // tables manually + stamping version=1.
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
      CREATE TABLE parsed_documents (
        file_hash TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        extension TEXT NOT NULL,
        text TEXT NOT NULL,
        page_count INTEGER,
        warnings_json TEXT NOT NULL DEFAULT '[]',
        accessed_at INTEGER NOT NULL
      );
      INSERT INTO schema_meta VALUES ('version', 1);
    `);

    expect(tableHas(db, "parsed_documents", "unsupported_reason")).toBe(false);
    expect(tableHas(db, "parsed_documents", "page_offsets_json")).toBe(false);

    migrate(db);

    expect(tableHas(db, "parsed_documents", "unsupported_reason")).toBe(true);
    expect(tableHas(db, "parsed_documents", "page_offsets_json")).toBe(true);
    expect(schemaVersion(db)).toBe(3);
  });

  it("preserves existing rows through a v1 → v3 migration", () => {
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
      CREATE TABLE parsed_documents (
        file_hash TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        extension TEXT NOT NULL,
        text TEXT NOT NULL,
        page_count INTEGER,
        warnings_json TEXT NOT NULL DEFAULT '[]',
        accessed_at INTEGER NOT NULL
      );
      INSERT INTO schema_meta VALUES ('version', 1);
      INSERT INTO parsed_documents (file_hash, path, name, extension, text, page_count, accessed_at)
      VALUES ('hash1', '/foo.pdf', 'foo.pdf', 'pdf', 'body', 5, 1234567);
    `);

    migrate(db);

    const row = db
      .prepare("SELECT * FROM parsed_documents WHERE file_hash = 'hash1'")
      .get() as Record<string, unknown>;
    expect(row.path).toBe("/foo.pdf");
    expect(row.text).toBe("body");
    // New columns exist but the migrated row has nulls for them — OK.
    expect(row.unsupported_reason).toBeNull();
    expect(row.page_offsets_json).toBeNull();
  });
});
