import { afterEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { OllamaEmbeddingProvider } from "./OllamaEmbeddingProvider";

const DEFAULT_OPTS = {
  model: "nomic-embed-text",
  dimensions: 3,
  ollamaBaseUrl: "http://host:11434",
};

const ok = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const err = (status: number, text: string): Response =>
  ({
    ok: false,
    status,
    json: async () => ({}),
    text: async () => text,
  }) as unknown as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OllamaEmbeddingProvider — preconditions + URL handling", () => {
  it("returns empty result for empty input (no fetch)", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await new OllamaEmbeddingProvider().embedBatch([], DEFAULT_OPTS);
    expect(result).toEqual({ vectors: [], promptTokens: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to localhost:11434 when ollamaBaseUrl is empty/missing", async () => {
    const fetch = vi.fn().mockResolvedValue(ok({ embedding: [1, 2, 3] }));
    vi.stubGlobal("fetch", fetch);
    await new OllamaEmbeddingProvider().embedBatch(["a"], {
      model: "m",
      dimensions: 3,
      ollamaBaseUrl: "",
    });
    expect(fetch.mock.calls[0][0]).toBe("http://localhost:11434/api/embeddings");
  });

  it("strips a trailing slash from ollamaBaseUrl", async () => {
    const fetch = vi.fn().mockResolvedValue(ok({ embedding: [1, 2, 3] }));
    vi.stubGlobal("fetch", fetch);
    await new OllamaEmbeddingProvider().embedBatch(["a"], {
      ...DEFAULT_OPTS,
      ollamaBaseUrl: "http://host:11434///",
    });
    expect(fetch.mock.calls[0][0]).toBe("http://host:11434/api/embeddings");
  });

  it("trims surrounding whitespace from ollamaBaseUrl", async () => {
    const fetch = vi.fn().mockResolvedValue(ok({ embedding: [1, 2, 3] }));
    vi.stubGlobal("fetch", fetch);
    await new OllamaEmbeddingProvider().embedBatch(["a"], {
      ...DEFAULT_OPTS,
      ollamaBaseUrl: "  http://host:11434  ",
    });
    expect(fetch.mock.calls[0][0]).toBe("http://host:11434/api/embeddings");
  });
});

describe("OllamaEmbeddingProvider — response shapes", () => {
  it("accepts the legacy `embedding` field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ embedding: [1, 2, 3] })));
    const result = await new OllamaEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS);
    expect(result.vectors).toEqual([[1, 2, 3]]);
  });

  it("accepts the newer `embeddings[0]` field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ok({ embeddings: [[4, 5, 6]] })),
    );
    const result = await new OllamaEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS);
    expect(result.vectors).toEqual([[4, 5, 6]]);
  });

  it("throws when the response has neither field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({})));
    await expect(
      new OllamaEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS),
    ).rejects.toThrow(/no embedding vector/);
  });

  it("always returns promptTokens = 0 (Ollama doesn't report)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ embedding: [1, 2, 3] })));
    const result = await new OllamaEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS);
    expect(result.promptTokens).toBe(0);
  });
});

describe("OllamaEmbeddingProvider — fan-out + error paths", () => {
  it("issues one fetch per text (Ollama is one prompt per call)", async () => {
    const fetch = vi.fn().mockResolvedValue(ok({ embedding: [1, 2, 3] }));
    vi.stubGlobal("fetch", fetch);
    await new OllamaEmbeddingProvider().embedBatch(["a", "b", "c"], DEFAULT_OPTS);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("preserves input order in the returned vectors", async () => {
    const fetch = vi.fn(async (_url, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { prompt: string };
      const map: Record<string, number[]> = {
        a: [1, 0, 0],
        b: [0, 1, 0],
        c: [0, 0, 1],
      };
      return ok({ embedding: map[body.prompt] });
    });
    vi.stubGlobal("fetch", fetch);
    const result = await new OllamaEmbeddingProvider().embedBatch(
      ["a", "b", "c"],
      DEFAULT_OPTS,
    );
    expect(result.vectors).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });

  it("throws on non-OK response, with status + body in the message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(err(503, "model not loaded")));
    await expect(
      new OllamaEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS),
    ).rejects.toThrow(/Ollama returned 503: model not loaded/);
  });

  it("wraps a fetch failure with a clearer Error message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ENOTFOUND")));
    await expect(
      new OllamaEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS),
    ).rejects.toThrow(/Ollama request failed: ENOTFOUND/);
  });

  it("throws when a returned vector has the wrong dimension count", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ embedding: [1, 2] })));
    await expect(
      new OllamaEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS),
    ).rejects.toThrow(/dims; profile expects 3/);
  });
});
