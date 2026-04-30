/**
 * One chunk's worth of data the corpus writer accepts. Generic by design
 * — the schema profile decides which DB columns receive which fields.
 */
export interface ChunkPayload {
  article: string | null;
  heading: string | null;
  text: string;
  embedding: number[];
}

// Source-type taxonomy moved into per-profile DocumentField options.
// Keeping the type alias for legacy import paths during the migration.
export type SourceType = string;
