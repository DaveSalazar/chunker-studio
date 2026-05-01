import type { Database as DatabaseInstance } from "better-sqlite3";

export const SCHEMA_VERSION = 3;

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS parsed_documents (
    file_hash TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    name TEXT NOT NULL,
    extension TEXT NOT NULL,
    text TEXT NOT NULL,
    page_count INTEGER,
    page_offsets_json TEXT,
    warnings_json TEXT NOT NULL DEFAULT '[]',
    unsupported_reason TEXT,
    accessed_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chunking_runs (
    text_hash TEXT NOT NULL,
    settings_hash TEXT NOT NULL,
    settings_json TEXT NOT NULL,
    total_tokens INTEGER NOT NULL,
    total_chars INTEGER NOT NULL,
    strategy TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    estimated_cost_usd REAL NOT NULL,
    accessed_at INTEGER NOT NULL,
    PRIMARY KEY (text_hash, settings_hash)
  );
  CREATE TABLE IF NOT EXISTS chunks (
    text_hash TEXT NOT NULL,
    settings_hash TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    article TEXT,
    heading TEXT,
    text TEXT NOT NULL,
    char_count INTEGER NOT NULL,
    token_count INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    manually_edited INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (text_hash, settings_hash, chunk_index),
    FOREIGN KEY (text_hash, settings_hash)
      REFERENCES chunking_runs (text_hash, settings_hash)
      ON DELETE CASCADE
  );
`;

export function migrate(db: DatabaseInstance): void {
  db.exec(CREATE_SQL);
  const row = db
    .prepare("SELECT value FROM schema_meta WHERE key = 'version'")
    .get() as { value: number } | undefined;
  const current = row?.value ?? 0;
  if (current < 1) {
    db.prepare("INSERT INTO schema_meta (key, value) VALUES ('version', ?)").run(1);
  }
  if (current < 2) {
    // v1 → v2: add unsupported_reason for cached scanned-PDF detection.
    // Guarded by columnExists since the CREATE TABLE above already
    // includes it when the DB is fresh.
    if (!columnExists(db, "parsed_documents", "unsupported_reason")) {
      db.exec("ALTER TABLE parsed_documents ADD COLUMN unsupported_reason TEXT");
    }
    db.prepare("UPDATE schema_meta SET value = ? WHERE key = 'version'").run(2);
  }
  if (current < 3) {
    // v2 → v3: add page_offsets_json for chunk → PDF page jumps. Pre-v3
    // cached parses come back with `pageOffsets` undefined; the renderer
    // silently disables click-to-page until they're re-parsed.
    if (!columnExists(db, "parsed_documents", "page_offsets_json")) {
      db.exec("ALTER TABLE parsed_documents ADD COLUMN page_offsets_json TEXT");
    }
    db.prepare("UPDATE schema_meta SET value = ? WHERE key = 'version'").run(3);
  }
}

function columnExists(db: DatabaseInstance, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}
