/**
 * One chunk's worth of data the corpus writer accepts. Generic by design
 * — the schema profile decides which DB columns receive which fields.
 *
 * `text` is the embedded surface (the same string that produced
 * `embedding`); `body` is the verbatim source kept for downstream
 * verbatim use (template generation in the backend). For article-aware
 * chunking `body` is null and the body column is not written.
 */
export interface ChunkPayload {
  article: string | null;
  heading: string | null;
  text: string;
  body: string | null;
  embedding: number[];
}

// Source-type taxonomy moved into per-profile DocumentField options.
// Keeping the type alias for legacy import paths during the migration.
export type SourceType = string;
