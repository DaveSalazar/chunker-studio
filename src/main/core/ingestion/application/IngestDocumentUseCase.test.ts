import { describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { IngestDocumentUseCase } from "./IngestDocumentUseCase";
import { MissingConfigError } from "../../config/domain/ConfigEntities";
import { BATCH_SIZE } from "../../embedding/domain/EmbeddingProvider";
import type { AppConfig, ChunkRecord, SchemaProfile } from "../../../../shared/types";
import type { IngestRequest } from "../domain/IngestionEntities";

const profile: SchemaProfile = {
  id: "p1",
  name: "Test",
  description: "",
  table: "rows",
  textColumn: "text",
  embeddingColumn: "embedding",
  articleColumn: "article",
  headingColumn: "heading",
  documentFields: [],
  chunking: "articleAware",
  embedding: { providerId: "openai", model: "m", dimensions: 3 },
};

const baseConfig = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  openaiApiKey: "sk-x",
  databaseUrl: "postgres://h/db",
  ollamaUrl: null,
  profiles: [profile],
  defaultProfileId: "p1",
  ...overrides,
});

const chunk = (i: number): ChunkRecord => ({
  index: i,
  article: null,
  heading: null,
  text: `c${i}`,
  charCount: 2,
  tokenCount: 1,
  startOffset: 0,
  endOffset: 2,
});

const request = (overrides: Partial<IngestRequest> = {}): IngestRequest => ({
  jobId: "job-1",
  profileId: "p1",
  documentFieldValues: {},
  chunks: [chunk(1)],
  ...overrides,
});

const mocks = (config: AppConfig = baseConfig()) => {
  const provider = {
    embedBatch: vi
      .fn()
      .mockResolvedValue({ vectors: [[1, 2, 3]], promptTokens: 7 }),
  };
  const providers = { resolve: vi.fn().mockReturnValue(provider) };
  const corpus = {
    writeChunks: vi.fn().mockResolvedValue({ deleted: 0, inserted: 1 }),
    ping: vi.fn(),
  };
  const getConfig = { execute: vi.fn().mockResolvedValue(config) };
  const onProgress = vi.fn();
  // ts-expect-error: skipping interface conformance for the mock — only the
  // methods exercised by the use case are stubbed.
  // @ts-expect-error
  const useCase = new IngestDocumentUseCase(getConfig, providers, corpus);
  return { useCase, getConfig, providers, corpus, provider, onProgress };
};

describe("IngestDocumentUseCase — preconditions", () => {
  it("throws MissingConfigError when databaseUrl is null", async () => {
    const { useCase, onProgress } = mocks(baseConfig({ databaseUrl: null }));
    await expect(useCase.execute(request(), onProgress)).rejects.toBeInstanceOf(
      MissingConfigError,
    );
  });

  it("throws when the requested profile id does not exist", async () => {
    const { useCase, onProgress } = mocks();
    await expect(
      useCase.execute(request({ profileId: "nope" }), onProgress),
    ).rejects.toThrow(/Schema profile not found: nope/);
  });

  it("throws MissingConfigError when openai-pinned profile has no API key", async () => {
    const { useCase, onProgress } = mocks(baseConfig({ openaiApiKey: null }));
    await expect(useCase.execute(request(), onProgress)).rejects.toBeInstanceOf(
      MissingConfigError,
    );
  });

  it("does NOT throw for an Ollama profile with no ollamaUrl (falls back)", async () => {
    const ollamaProfile = {
      ...profile,
      embedding: { providerId: "ollama" as const, model: "m", dimensions: 3 },
    };
    const cfg = baseConfig({
      openaiApiKey: null,
      ollamaUrl: null,
      profiles: [ollamaProfile],
    });
    const { useCase, onProgress } = mocks(cfg);
    await expect(useCase.execute(request(), onProgress)).resolves.toBeDefined();
  });

  it("rejects an empty chunks array", async () => {
    const { useCase, onProgress } = mocks();
    await expect(
      useCase.execute(request({ chunks: [] }), onProgress),
    ).rejects.toThrow(/zero chunks/);
  });
});

describe("IngestDocumentUseCase — embedding loop", () => {
  it("calls embedBatch in BATCH_SIZE-sized slices", async () => {
    const total = BATCH_SIZE + 5;
    const chunks = Array.from({ length: total }, (_, i) => chunk(i + 1));
    const { useCase, provider, onProgress } = mocks();
    provider.embedBatch
      .mockResolvedValueOnce({
        vectors: Array.from({ length: BATCH_SIZE }, () => [1, 2, 3]),
        promptTokens: 100,
      })
      .mockResolvedValueOnce({
        vectors: Array.from({ length: 5 }, () => [4, 5, 6]),
        promptTokens: 5,
      });
    await useCase.execute(request({ chunks }), onProgress);
    expect(provider.embedBatch).toHaveBeenCalledTimes(2);
    expect(provider.embedBatch.mock.calls[0][0]).toHaveLength(BATCH_SIZE);
    expect(provider.embedBatch.mock.calls[1][0]).toHaveLength(5);
  });

  it("throws when the provider returns a wrong-length batch", async () => {
    const { useCase, provider, onProgress } = mocks();
    provider.embedBatch.mockResolvedValueOnce({
      vectors: [], // expected 1
      promptTokens: 0,
    });
    await expect(useCase.execute(request(), onProgress)).rejects.toThrow(
      /Embedding count mismatch/,
    );
  });
});

describe("IngestDocumentUseCase — happy path", () => {
  it("emits embedding → writing → done progress callbacks", async () => {
    const { useCase, onProgress } = mocks();
    await useCase.execute(request(), onProgress);
    const phases = onProgress.mock.calls.map((c) => c[0].phase);
    expect(phases).toEqual(["embedding", "embedding", "writing", "done"]);
  });

  it("returns a summary with the right counts and prompt tokens", async () => {
    const { useCase, onProgress } = mocks();
    const summary = await useCase.execute(request(), onProgress);
    expect(summary).toMatchObject({
      jobId: "job-1",
      profileId: "p1",
      chunksEmbedded: 1,
      chunksDeleted: 0,
      chunksInserted: 1,
      promptTokens: 7,
    });
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("forwards databaseUrl + profile + payloads to corpus.writeChunks", async () => {
    const { useCase, corpus, onProgress } = mocks();
    await useCase.execute(request(), onProgress);
    expect(corpus.writeChunks).toHaveBeenCalledWith(
      "postgres://h/db",
      profile,
      {},
      [
        expect.objectContaining({ text: "c1", embedding: [1, 2, 3] }),
      ],
    );
  });
});
