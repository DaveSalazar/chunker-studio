import pgvector from "pgvector/pg";
import type { ChunkPayload } from "../domain/CorpusEntities";
import type { SchemaProfile } from "../../../../shared/types";
import { extractTemplateFields } from "../../../../shared/lib/extractTemplateFields";
import {
  buildSkeleton,
  makeIntentSurface,
} from "../../../../shared/lib/skeleton";

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

  // Per-chunk fields. text + embedding are required; article/heading/body
  // optional and only added when the profile maps them to a column. The
  // body column carries the verbatim source text emitted by the
  // wholeDocument strategy — for article-aware chunks the value is null,
  // which the writer happily passes through.
  if (profile.articleColumn) {
    columns.push({ name: profile.articleColumn, valueFor: (c) => c.article });
  }
  if (profile.headingColumn) {
    columns.push({ name: profile.headingColumn, valueFor: (c) => c.heading });
  }
  if (profile.bodyColumn) {
    columns.push({ name: profile.bodyColumn, valueFor: (c) => c.body });
  }
  // For skeleton profiles, build the skeleton ONCE per chunk and reuse
  // it across the sections / citations / fields / text columns —
  // otherwise we'd re-parse the body up to four times. WeakMap keyed by
  // the chunk so the cache lifetime matches the writer's iteration.
  const skeletonCache = new WeakMap<ChunkPayload, ReturnType<typeof buildSkeleton>>();
  const skel = (c: ChunkPayload) => {
    let s = skeletonCache.get(c);
    if (!s) {
      s = c.body
        ? buildSkeleton(c.body)
        : { sections: [], fields: [], citations: [] };
      skeletonCache.set(c, s);
    }
    return s;
  };

  if (profile.fieldsColumn) {
    // Parse `<<FIELD>>` markers out of the body and persist a typed
    // schema as jsonb. We hand pg a pre-stringified JSON literal
    // because node-postgres treats unknown column types as text by
    // default — letting it auto-stringify only works once the driver
    // has cached jsonb's OID, which doesn't always happen across pool
    // recycles. Stringifying ourselves is unambiguous either way.
    // For skeleton profiles, prefer the skeleton's own field list so
    // dedup / order tracks the rest of the row.
    columns.push({
      name: profile.fieldsColumn,
      valueFor: (c) =>
        JSON.stringify(
          profile.sectionsColumn
            ? skel(c).fields
            : c.body
              ? extractTemplateFields(c.body)
              : [],
        ),
    });
  }
  if (profile.sectionsColumn) {
    columns.push({
      name: profile.sectionsColumn,
      valueFor: (c) => JSON.stringify(skel(c).sections),
    });
  }
  if (profile.citationsColumn) {
    columns.push({
      name: profile.citationsColumn,
      valueFor: (c) => JSON.stringify(skel(c).citations),
    });
  }
  // Text column. For skeleton profiles we replace the per-chunk
  // first-1500-chars surface with a copyright-light intent surface
  // (title + doc type + section headings) so the embedded vector
  // captures retrieval intent without leaking source prose. The
  // documentFieldValues are the operator-supplied per-doc constants
  // (title, docType keys; mirror what legal-skeletons declares).
  if (profile.sectionsColumn) {
    const titleVal = documentFieldValues["title"] ?? "";
    const typeVal =
      documentFieldValues["docType"] ?? documentFieldValues["templateType"] ?? "";
    columns.push({
      name: profile.textColumn,
      valueFor: (c) => makeIntentSurface(titleVal, typeVal, skel(c).sections),
    });
  } else {
    columns.push({ name: profile.textColumn, valueFor: (c) => c.text });
  }
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
