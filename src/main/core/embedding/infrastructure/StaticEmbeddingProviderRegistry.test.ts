import { describe, expect, it } from "vitest";
import "reflect-metadata";
import { StaticEmbeddingProviderRegistry } from "./StaticEmbeddingProviderRegistry";
import type { EmbeddingProvider } from "../domain/EmbeddingProvider";

const openai = { embedBatch: async () => ({ vectors: [], promptTokens: 0 }) } as EmbeddingProvider;
const ollama = { embedBatch: async () => ({ vectors: [], promptTokens: 0 }) } as EmbeddingProvider;

describe("StaticEmbeddingProviderRegistry", () => {
  it("resolves 'openai' to the OpenAI provider", () => {
    const reg = new StaticEmbeddingProviderRegistry(openai, ollama);
    expect(reg.resolve("openai")).toBe(openai);
  });

  it("resolves 'ollama' to the Ollama provider", () => {
    const reg = new StaticEmbeddingProviderRegistry(openai, ollama);
    expect(reg.resolve("ollama")).toBe(ollama);
  });

  it("throws on an unknown providerId", () => {
    const reg = new StaticEmbeddingProviderRegistry(openai, ollama);
    // @ts-expect-error: deliberately exercising the runtime check.
    expect(() => reg.resolve("anthropic")).toThrow(/Unsupported embedding provider/);
  });
});
