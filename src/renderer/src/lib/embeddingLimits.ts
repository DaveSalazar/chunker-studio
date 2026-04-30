import type { EmbeddingProviderId } from "@shared/types";

/**
 * Default output dimension for known OpenAI embedding models. The
 * `dimensions` API parameter on `text-embedding-3-{small,large}` lets
 * callers truncate to a smaller value, so a deliberate mismatch is
 * legal — but the most common operator error is a stale or hand-typed
 * value, so we still surface it as a warning.
 */
const OPENAI_DEFAULT_DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
};

/**
 * Maximum input-token window common to every OpenAI embedding model
 * (text-embedding-3-small/large and ada-002 all cap at 8191). Chunks
 * above this size cannot be embedded — the API truncates or rejects.
 * Conservative round number leaves a small safety margin for tokenizer
 * disagreement between tiktoken and OpenAI's server-side counter.
 */
export const EMBEDDING_INPUT_TOKEN_CAP = 8000;

/**
 * Expected default dimension for a (provider, model) pair when known.
 * Returns null for Ollama (varies per model — use the Probe button) and
 * for OpenAI models we don't have hardcoded.
 */
export function expectedDimensionFor(
  providerId: EmbeddingProviderId,
  model: string,
): number | null {
  if (providerId !== "openai") return null;
  return OPENAI_DEFAULT_DIMENSIONS[model] ?? null;
}
