import { inject, injectable } from "inversify";
import { EmbeddingLocator } from "../domain/EmbeddingLocator";
import type { EmbeddingProvider } from "../domain/EmbeddingProvider";
import type { EmbeddingProviderRegistry } from "../domain/EmbeddingProviderRegistry";
import type { EmbeddingProviderId } from "../../../../shared/types";

/**
 * Tiny dispatch table over the providers wired in `core/index.ts`.
 * Adding a new provider is two lines: bind it in the container, add a
 * branch here.
 */
@injectable()
export class StaticEmbeddingProviderRegistry implements EmbeddingProviderRegistry {
  constructor(
    @inject(EmbeddingLocator.OpenAIEmbeddingProvider)
    private readonly openai: EmbeddingProvider,
    @inject(EmbeddingLocator.OllamaEmbeddingProvider)
    private readonly ollama: EmbeddingProvider,
  ) {}

  resolve(providerId: EmbeddingProviderId): EmbeddingProvider {
    if (providerId === "openai") return this.openai;
    if (providerId === "ollama") return this.ollama;
    throw new Error(`Unsupported embedding provider: ${providerId}`);
  }
}
