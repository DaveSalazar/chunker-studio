// Schema profiles + AppConfig + diagnostics.

/**
 * Embedding provider IDs supported by the app. The profile pins one
 * provider + model + dimension so a write never silently corrupts a
 * fixed-dim vector column.
 */
export type EmbeddingProviderId = "openai" | "ollama";

export interface EmbeddingPin {
  providerId: EmbeddingProviderId;
  model: string;
  dimensions: number;
}

export type DocumentFieldKind = "text" | "select";

export interface DocumentFieldOption {
  value: string;
  label: string;
}

/**
 * One column the operator fills in the IngestDialog. Same value gets
 * written to every row for a given ingest run (per-document constant).
 *
 * `isSourceKey` marks the field that the corpus repo uses as a natural
 * key for replace-by-source: DELETE WHERE column = value before INSERT.
 * At most one field per profile may carry that flag.
 */
export interface DocumentField {
  key: string;
  column: string;
  label: string;
  hint?: string;
  kind: DocumentFieldKind;
  required?: boolean;
  options?: DocumentFieldOption[];
  defaultValue?: string;
  isSourceKey?: boolean;
  /**
   * Marks the field that holds the human-readable title. The IngestDialog
   * seeds it from the filename (cleaned: dashes → spaces, sentence-cased).
   * At most one field per profile may carry this flag. Used by the
   * wholeDocument strategy where the slug (`isSourceKey`) and the
   * display label are different concepts.
   */
  isTitleKey?: boolean;
}

// `ChunkingStrategyId` lives in ./chunks (imported below) so the runtime
// ChunkSettings type and the profile selection share one source. The
// public barrel re-exports it from the chunks module — no alias here to
// avoid a duplicate-export collision when both files re-export through
// `export * from`.
import type { ChunkingStrategyId } from "./chunks";

export interface SchemaProfile {
  id: string;
  name: string;
  description: string;
  /** Target table. */
  table: string;
  /** Required: the per-chunk text column (what gets embedded). */
  textColumn: string;
  /** Required: the per-chunk embedding column (vector type). */
  embeddingColumn: string;
  /** Per-chunk article column. Null when the profile doesn't track articles. */
  articleColumn: string | null;
  /** Per-chunk heading column. Null when the profile doesn't track headings. */
  headingColumn: string | null;
  /**
   * Per-chunk body column. When set, the writer stores the chunk's full
   * `body` (verbatim source text) here, separate from the `text` column
   * that holds the embedded intent surface. Only the wholeDocument
   * strategy emits a non-null body; for article-aware chunking this
   * stays null on the profile and the column isn't written.
   */
  bodyColumn?: string | null;
  /**
   * Per-chunk fields column. When set, the writer parses `<<FIELD>>`
   * markers out of the chunk's body and stores the deduped list as a
   * jsonb array. Drives the form-fill UI in the desktop app once the
   * `find_skeleton` tool is wired.
   */
  fieldsColumn?: string | null;
  /**
   * Per-chunk sections column. When set (skeleton profiles), the writer
   * runs the skeleton extractor (`buildSkeleton`) on the chunk body and
   * stores the ordered list of {order, heading, fieldNames, citationKeys}
   * as a jsonb array. The presence of this column ALSO switches the
   * `textColumn` from "first ~1500 chars of body" to an intent-surface
   * built from `documentFieldValues.title + docType + section headings`,
   * since copyrightable prose must not be embedded in the LLM-visible
   * `text` column for skeleton-driven generation.
   */
  sectionsColumn?: string | null;
  /**
   * Per-chunk citations column. When set, the writer extracts statutory
   * citations (`Art. N` + code abbreviation) from the chunk body and
   * stores them as a jsonb array of {key, code, article}. The chat
   * pipeline uses these keys to pull verbatim article text from
   * `corpus_chunks` at draft time.
   */
  citationsColumn?: string | null;
  /** Per-document constant fields written to every inserted row. */
  documentFields: DocumentField[];
  /** Default chunking strategy when this profile is active. */
  chunking: ChunkingStrategyId;
  embedding: EmbeddingPin;
  /** Marks profiles bundled with the app — editable but not deletable. */
  builtIn?: boolean;
}

export interface AppConfig {
  openaiApiKey: string | null;
  databaseUrl: string | null;
  /** Base URL for the local Ollama server. Defaults to http://localhost:11434 when unset. */
  ollamaUrl: string | null;
  profiles: SchemaProfile[];
  defaultProfileId: string | null;
}

export interface ConnectionTestResult {
  version: string;
  durationMs: number;
}

export interface OllamaModel {
  name: string;
  /** Family + parameter size, when reported by Ollama (e.g. "llama 8B"). */
  details?: string;
  /** Embedding dimension, when known via /api/show. Null when not yet probed. */
  embeddingDimensions: number | null;
}
