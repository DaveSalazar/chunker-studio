import { afterEach, describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { OpenAIEmbeddingProvider } from "./OpenAIEmbeddingProvider";
import { BATCH_SIZE } from "../domain/EmbeddingProvider";

const DEFAULT_OPTS = { model: "m", dimensions: 3, openaiApiKey: "sk-x" };

const fakeResponse = (
  init: { status?: number; body?: unknown; text?: string } = {},
): Response =>
  ({
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    json: async () => init.body ?? {},
    text: async () => init.text ?? JSON.stringify(init.body ?? {}),
  }) as unknown as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAIEmbeddingProvider — preconditions", () => {
  it("returns an empty BatchResult for empty input (no fetch)", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const result = await new OpenAIEmbeddingProvider().embedBatch([], DEFAULT_OPTS);
    expect(result).toEqual({ vectors: [], promptTokens: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when called with more than BATCH_SIZE texts", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const tooMany = Array.from({ length: BATCH_SIZE + 1 }, () => "x");
    await expect(
      new OpenAIEmbeddingProvider().embedBatch(tooMany, DEFAULT_OPTS),
    ).rejects.toThrow(/max is/);
  });

  it("throws when openaiApiKey is missing", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(
      new OpenAIEmbeddingProvider().embedBatch(["a"], { ...DEFAULT_OPTS, openaiApiKey: undefined }),
    ).rejects.toThrow(/openaiApiKey/);
  });
});

describe("OpenAIEmbeddingProvider — happy path", () => {
  it("posts model + input to the embeddings endpoint with the bearer token", async () => {
    const fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        body: { data: [{ index: 0, embedding: [1, 2, 3] }], usage: { prompt_tokens: 4 } },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await new OpenAIEmbeddingProvider().embedBatch(["hi"], DEFAULT_OPTS);
    expect(result.vectors).toEqual([[1, 2, 3]]);
    expect(result.promptTokens).toBe(4);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/embeddings");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-x");
    expect(JSON.parse(init.body as string)).toEqual({ model: "m", input: ["hi"] });
  });

  it("sorts embeddings by their `index` field (OpenAI may return out of order)", async () => {
    const fetch = vi.fn().mockResolvedValue(
      fakeResponse({
        body: {
          data: [
            { index: 1, embedding: [4, 5, 6] },
            { index: 0, embedding: [1, 2, 3] },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await new OpenAIEmbeddingProvider().embedBatch(["a", "b"], DEFAULT_OPTS);
    expect(result.vectors).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it("defaults promptTokens to 0 when usage is absent from the response", async () => {
    const fetch = vi.fn().mockResolvedValue(
      fakeResponse({ body: { data: [{ index: 0, embedding: [1, 2, 3] }] } }),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await new OpenAIEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS);
    expect(result.promptTokens).toBe(0);
  });
});

describe("OpenAIEmbeddingProvider — error paths", () => {
  it("includes the response body when status is not OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(fakeResponse({ status: 401, text: "invalid api key" })),
    );
    await expect(
      new OpenAIEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS),
    ).rejects.toThrow(/OpenAI returned 401: invalid api key/);
  });

  it("throws when the response is missing the data array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeResponse({ body: {} })));
    await expect(
      new OpenAIEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS),
    ).rejects.toThrow(/missing data array/);
  });

  it("throws when an embedding's length disagrees with options.dimensions", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          fakeResponse({ body: { data: [{ index: 0, embedding: [1, 2] }] } }),
        ),
    );
    await expect(
      new OpenAIEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS),
    ).rejects.toThrow(/dims; profile expects 3/);
  });

  it("wraps a network/abort failure in a descriptive Error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNRESET")),
    );
    await expect(
      new OpenAIEmbeddingProvider().embedBatch(["a"], DEFAULT_OPTS),
    ).rejects.toThrow(/OpenAI request failed: ECONNRESET/);
  });
});
