/**
 * Provider-agnostic embedding contract. Each profile pins
 * `(providerId, model, dimensions)`; the registry resolves the
 * corresponding provider, and the ingestion use-case calls
 * `embedBatch` with the provider's required credentials.
 */

/** Max items per `embedBatch` call. OpenAI's API caps at 2048; smaller batches recover faster on flakes. */
export const BATCH_SIZE = 100;

export interface EmbedOptions {
  /** Model name pinned by the profile (e.g. "text-embedding-3-small", "nomic-embed-text"). */
  model: string;
  /** Expected dimension. Provider verifies every returned vector has this length. */
  dimensions: number;
  /** OpenAI provider — bearer token. */
  openaiApiKey?: string;
  /** Ollama provider — base URL (e.g. "http://localhost:11434"). */
  ollamaBaseUrl?: string;
  /** Per-batch timeout in milliseconds. Defaults to 60s. */
  timeoutMs?: number;
}

export interface BatchResult {
  vectors: number[][];
  /** Tokens reported by the provider for cost tracking; 0 when not reported (e.g. Ollama). */
  promptTokens: number;
}

export interface EmbeddingProvider {
  /**
   * Embed a single batch (≤ BATCH_SIZE). Implementation is responsible
   * for verifying every returned vector has `options.dimensions` floats
   * so a dimension mismatch fails fast instead of writing junk to a
   * fixed-dim vector column.
   */
  embedBatch(texts: string[], options: EmbedOptions): Promise<BatchResult>;
}
