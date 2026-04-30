import type { EmbeddingProviderId } from "../../../../shared/types";
import type { EmbeddingProvider } from "./EmbeddingProvider";

export interface EmbeddingProviderRegistry {
  /** Resolve a provider by its profile-pinned id. Throws when unsupported. */
  resolve(providerId: EmbeddingProviderId): EmbeddingProvider;
}
