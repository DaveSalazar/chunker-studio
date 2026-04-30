import { injectable } from "inversify";
import {
  BATCH_SIZE,
  type BatchResult,
  type EmbedOptions,
  type EmbeddingProvider,
} from "../domain/EmbeddingProvider";

const ENDPOINT = "https://api.openai.com/v1/embeddings";

interface OpenAIEmbeddingResponse {
  data: { index: number; embedding: number[] }[];
  usage?: { prompt_tokens?: number };
}

/**
 * Thin HTTP client against OpenAI's embeddings endpoint. Model and
 * dimension are passed in via `EmbedOptions` (sourced from the active
 * profile) — the same provider can serve any
 * text-embedding-* model the profile names.
 *
 * Failure shape: throws `Error` with a useful message. Common cases:
 *   - 401 — bad API key (surfaced verbatim from OpenAI's body)
 *   - 429 — rate limit or quota
 *   - dim mismatch — server returned a vector with the wrong length
 */
@injectable()
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  async embedBatch(texts: string[], options: EmbedOptions): Promise<BatchResult> {
    if (texts.length === 0) return { vectors: [], promptTokens: 0 };
    if (texts.length > BATCH_SIZE) {
      throw new Error(
        `embedBatch called with ${texts.length} texts; max is ${BATCH_SIZE}`,
      );
    }
    if (!options.openaiApiKey) {
      throw new Error("OpenAI provider requires `openaiApiKey` in options");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);

    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${options.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: options.model, input: texts }),
      });
    } catch (err) {
      throw new Error(
        `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI returned ${response.status}: ${body}`);
    }

    const json = (await response.json()) as OpenAIEmbeddingResponse;
    if (!Array.isArray(json.data)) {
      throw new Error("Unexpected OpenAI response: missing data array");
    }

    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    const vectors = sorted.map((item) => item.embedding);
    for (const v of vectors) {
      if (v.length !== options.dimensions) {
        throw new Error(
          `OpenAI returned an embedding with ${v.length} dims; profile expects ${options.dimensions}`,
        );
      }
    }

    return {
      vectors,
      promptTokens: json.usage?.prompt_tokens ?? 0,
    };
  }
}
