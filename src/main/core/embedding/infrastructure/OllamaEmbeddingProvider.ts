import { injectable } from "inversify";
import {
  type BatchResult,
  type EmbedOptions,
  type EmbeddingProvider,
} from "../domain/EmbeddingProvider";

const DEFAULT_BASE_URL = "http://localhost:11434";
/** How many embedding requests to keep in flight at once when batching. */
const CONCURRENCY = 4;

interface OllamaEmbeddingResponse {
  embedding?: number[];
  /** Newer Ollama builds return the vector under `embeddings[0]` — accept either. */
  embeddings?: number[][];
}

/**
 * Talks to a local Ollama server at `options.ollamaBaseUrl`. Ollama's
 * `/api/embeddings` endpoint accepts ONE prompt per call, so batching
 * here is just a bounded fan-out over the input list.
 *
 * Quirk: Ollama doesn't report token counts on its embeddings endpoint,
 * so `promptTokens` is always 0. The cost preview in the IngestDialog
 * already treats Ollama as free.
 */
@injectable()
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  async embedBatch(texts: string[], options: EmbedOptions): Promise<BatchResult> {
    if (texts.length === 0) return { vectors: [], promptTokens: 0 };
    const base = (options.ollamaBaseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const endpoint = `${base}/api/embeddings`;
    const timeoutMs = options.timeoutMs ?? 60_000;

    const vectors = new Array<number[]>(texts.length);
    let cursor = 0;
    const workers: Promise<void>[] = [];
    for (let w = 0; w < Math.min(CONCURRENCY, texts.length); w++) {
      workers.push(
        (async () => {
          while (cursor < texts.length) {
            const idx = cursor++;
            vectors[idx] = await embedOne(endpoint, options.model, texts[idx], timeoutMs);
            verifyDims(vectors[idx], options.dimensions);
          }
        })(),
      );
    }
    await Promise.all(workers);
    return { vectors, promptTokens: 0 };
  }
}

async function embedOne(
  endpoint: string,
  model: string,
  prompt: string,
  timeoutMs: number,
): Promise<number[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt }),
    });
  } catch (err) {
    throw new Error(
      `Ollama request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama returned ${response.status}: ${body}`);
  }
  const json = (await response.json()) as OllamaEmbeddingResponse;
  const vec = json.embedding ?? json.embeddings?.[0];
  if (!Array.isArray(vec)) {
    throw new Error("Unexpected Ollama response: no embedding vector");
  }
  return vec;
}

function verifyDims(vec: number[], expected: number): void {
  if (vec.length !== expected) {
    throw new Error(
      `Ollama returned an embedding with ${vec.length} dims; profile expects ${expected}`,
    );
  }
}
