import pgvector from "pgvector/pg";
import type { ChunkPayload } from "../domain/CorpusEntities";
import type { SchemaProfile } from "../../../../shared/types";

interface ColumnSpec {
  name: string;
  valueFor: (chunk: ChunkPayload) => unknown;
}

export interface RowLayout {
  columns: ColumnSpec[];
  sourceKey: { column: string; value: string } | null;
}

/** Pre-compute the row layout once per ingest run. */
export function planLayout(
  profile: SchemaProfile,
  documentFieldValues: Record<string, string>,
): RowLayout {
  const columns: ColumnSpec[] = [];
  let sourceKey: RowLayout["sourceKey"] = null;

  // Per-document constants (same across all rows for one ingest).
  for (const field of profile.documentFields) {
    const value = documentFieldValues[field.key];
    if (field.required && (value === undefined || value === "")) {
      throw new Error(`Missing required value for "${field.label}" (${field.key})`);
    }
    if (value === undefined || value === "") continue;
    columns.push({ name: field.column, valueFor: () => value });
    if (field.isSourceKey) {
      sourceKey = { column: field.column, value };
    }
  }

  // Per-chunk fields. text + embedding are required; article/heading
  // optional and only added when the profile maps them to a column.
  if (profile.articleColumn) {
    columns.push({ name: profile.articleColumn, valueFor: (c) => c.article });
  }
  if (profile.headingColumn) {
    columns.push({ name: profile.headingColumn, valueFor: (c) => c.heading });
  }
  columns.push({ name: profile.textColumn, valueFor: (c) => c.text });
  columns.push({
    name: profile.embeddingColumn,
    valueFor: (c) => pgvector.toSql(c.embedding),
  });

  return { columns, sourceKey };
}

/**
 * Conservative double-quote-and-escape for a Postgres identifier.
 * Profiles are user-authored, so we treat their table/column names as
 * untrusted input. We don't try to handle schema-qualified names
 * ("public"."foo") here — the editor already restricts to a single
 * unqualified identifier per field.
 */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function sslConfigFor(
  databaseUrl: string,
): false | { rejectUnauthorized: boolean } {
  let mode: string | null = null;
  try {
    const u = new URL(databaseUrl);
    mode = u.searchParams.get("sslmode") ?? u.searchParams.get("ssl") ?? null;
    if (mode) mode = mode.toLowerCase();
  } catch {
    /* malformed URL — fall through to no-TLS */
  }
  if (mode === "require" || mode === "verify-ca") {
    return { rejectUnauthorized: false };
  }
  if (mode === "verify-full" || mode === "true" || mode === "1") {
    return { rejectUnauthorized: true };
  }
  return false;
}
