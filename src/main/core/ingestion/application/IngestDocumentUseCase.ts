import { inject, injectable } from "inversify";
import { ConfigLocator } from "../../config/domain/ConfigLocator";
import { GetConfigUseCase } from "../../config/application/GetConfigUseCase";
import { MissingConfigError } from "../../config/domain/ConfigEntities";
import { EmbeddingLocator } from "../../embedding/domain/EmbeddingLocator";
import { BATCH_SIZE } from "../../embedding/domain/EmbeddingProvider";
import type { EmbeddingProviderRegistry } from "../../embedding/domain/EmbeddingProviderRegistry";
import { CorpusLocator } from "../../corpus/domain/CorpusLocator";
import type { CorpusRepository } from "../../corpus/domain/CorpusRepository";
import type { ChunkPayload } from "../../corpus/domain/CorpusEntities";
import type { SchemaProfile } from "../../../../shared/types";
import type {
  IngestProgress,
  IngestRequest,
  IngestSummary,
} from "../domain/IngestionEntities";

export type ProgressCallback = (progress: IngestProgress) => void;

@injectable()
export class IngestDocumentUseCase {
  constructor(
    @inject(ConfigLocator.GetConfigUseCase)
    private readonly getConfig: GetConfigUseCase,
    @inject(EmbeddingLocator.EmbeddingProviderRegistry)
    private readonly providers: EmbeddingProviderRegistry,
    @inject(CorpusLocator.CorpusRepository)
    private readonly corpus: CorpusRepository,
  ) {}

  async execute(
    request: IngestRequest,
    onProgress: ProgressCallback,
  ): Promise<IngestSummary> {
    const startedAt = Date.now();
    const config = await this.getConfig.execute();
    if (!config.databaseUrl) throw new MissingConfigError("databaseUrl");

    const profile = config.profiles.find((p) => p.id === request.profileId);
    if (!profile) {
      throw new Error(`Schema profile not found: ${request.profileId}`);
    }

    validateRequiredCredentials(config, profile);

    const total = request.chunks.length;
    if (total === 0) {
      throw new Error("Cannot ingest a document with zero chunks");
    }

    const provider = this.providers.resolve(profile.embedding.providerId);
    const embedOptions = {
      model: profile.embedding.model,
      dimensions: profile.embedding.dimensions,
      openaiApiKey: config.openaiApiKey ?? undefined,
      ollamaBaseUrl: config.ollamaUrl ?? undefined,
    };

    // ── Phase 1: embed ─────────────────────────────────────────────────
    onProgress({
      jobId: request.jobId,
      phase: "embedding",
      processed: 0,
      total,
      tokensSoFar: 0,
    });

    const payloads: ChunkPayload[] = [];
    let tokensSoFar = 0;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const slice = request.chunks.slice(i, i + BATCH_SIZE);
      const result = await provider.embedBatch(
        slice.map((c) => c.text),
        embedOptions,
      );
      if (result.vectors.length !== slice.length) {
        throw new Error(
          `Embedding count mismatch: expected ${slice.length}, got ${result.vectors.length}`,
        );
      }
      slice.forEach((chunk, idx) => {
        payloads.push({
          article: chunk.article,
          heading: chunk.heading,
          text: chunk.text,
          embedding: result.vectors[idx],
        });
      });
      tokensSoFar += result.promptTokens;
      onProgress({
        jobId: request.jobId,
        phase: "embedding",
        processed: Math.min(i + BATCH_SIZE, total),
        total,
        tokensSoFar,
      });
    }

    // ── Phase 2: write ─────────────────────────────────────────────────
    onProgress({
      jobId: request.jobId,
      phase: "writing",
      processed: total,
      total,
      tokensSoFar,
    });

    const result = await this.corpus.writeChunks(
      config.databaseUrl,
      profile,
      request.documentFieldValues,
      payloads,
    );

    const summary: IngestSummary = {
      jobId: request.jobId,
      profileId: profile.id,
      documentFieldValues: request.documentFieldValues,
      chunksEmbedded: payloads.length,
      chunksDeleted: result.deleted,
      chunksInserted: result.inserted,
      promptTokens: tokensSoFar,
      durationMs: Date.now() - startedAt,
    };

    onProgress({
      jobId: request.jobId,
      phase: "done",
      processed: total,
      total,
      tokensSoFar,
    });

    return summary;
  }
}

function validateRequiredCredentials(
  config: { openaiApiKey: string | null; ollamaUrl: string | null },
  profile: SchemaProfile,
): void {
  if (profile.embedding.providerId === "openai" && !config.openaiApiKey) {
    throw new MissingConfigError("openaiApiKey");
  }
  // Ollama falls back to http://localhost:11434 when ollamaUrl is null,
  // so we don't raise a MissingConfigError — the HTTP request will fail
  // with a clear connection error if no Ollama is running.
}
