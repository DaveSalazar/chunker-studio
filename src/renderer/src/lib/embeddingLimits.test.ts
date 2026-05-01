import { describe, expect, it } from "vitest";
import { EMBEDDING_INPUT_TOKEN_CAP, expectedDimensionFor } from "./embeddingLimits";

describe("EMBEDDING_INPUT_TOKEN_CAP", () => {
  it("is set below OpenAI's 8191 hard cap (margin for tokenizer drift)", () => {
    expect(EMBEDDING_INPUT_TOKEN_CAP).toBeGreaterThan(0);
    expect(EMBEDDING_INPUT_TOKEN_CAP).toBeLessThan(8191);
  });
});

describe("expectedDimensionFor", () => {
  it("returns 1536 for text-embedding-3-small", () => {
    expect(expectedDimensionFor("openai", "text-embedding-3-small")).toBe(1536);
  });

  it("returns 3072 for text-embedding-3-large", () => {
    expect(expectedDimensionFor("openai", "text-embedding-3-large")).toBe(3072);
  });

  it("returns 1536 for the legacy ada-002 model", () => {
    expect(expectedDimensionFor("openai", "text-embedding-ada-002")).toBe(1536);
  });

  it("returns null for an unknown OpenAI model (avoids spurious warnings)", () => {
    expect(expectedDimensionFor("openai", "text-embedding-99-mystery")).toBeNull();
  });

  it("returns null for any Ollama model (use the Probe button instead)", () => {
    expect(expectedDimensionFor("ollama", "nomic-embed-text")).toBeNull();
    expect(expectedDimensionFor("ollama", "anything")).toBeNull();
  });

  it("model lookup is case-sensitive (matches the OpenAI ID exactly)", () => {
    expect(expectedDimensionFor("openai", "TEXT-EMBEDDING-3-SMALL")).toBeNull();
  });
});
