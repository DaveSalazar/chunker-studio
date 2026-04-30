// Schema profiles + reference taxonomy + AppConfig + diagnostics.

// Reference / template source-type taxonomy is now a per-profile
// concern. The constants below are kept as bundled defaults that the
// "Legal references" / "Legal templates" profiles seed.
export const REFERENCE_SOURCE_TYPES = [
  "codigo",
  "ley",
  "reglamento",
  "sentencia",
  "constitucion",
] as const;
export const TEMPLATE_SOURCE_TYPES = [
  "demanda",
  "contrato",
  "escrito",
  "denuncia",
  "guia",
  "manual",
  "plantilla",
] as const;
export const SOURCE_TYPES = [...REFERENCE_SOURCE_TYPES, ...TEMPLATE_SOURCE_TYPES] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

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
}

export type ChunkingStrategyId = "articleAware" | "paragraph";

export interface SchemaProfile {
  id: string;
  name: string;
  description: string;
  /** Target table. */
  table: string;
  /** Required: the per-chunk text column. */
  textColumn: string;
  /** Required: the per-chunk embedding column (vector type). */
  embeddingColumn: string;
  /** Per-chunk article column. Null when the profile doesn't track articles. */
  articleColumn: string | null;
  /** Per-chunk heading column. Null when the profile doesn't track headings. */
  headingColumn: string | null;
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
