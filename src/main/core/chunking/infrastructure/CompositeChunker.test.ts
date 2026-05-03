import { describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { CompositeChunker } from "./CompositeChunker";
import type { Chunker } from "../domain/Chunker";
import type {
  ChunkingOutcome,
  ChunkingStrategyId,
  ChunkSettings,
} from "../domain/ChunkingEntities";

const settings = (
  strategy: ChunkingStrategyId,
  overrides: Partial<ChunkSettings> = {},
): ChunkSettings => ({
  maxChunkTokens: 500,
  minChunkChars: 20,
  headingLookback: 600,
  letterRatio: 40,
  dehyphenate: true,
  splitByArticle: true,
  chunkingStrategy: strategy,
  normalizePlaceholders: false,
  ...overrides,
});

const stubOutcome = (label: string): ChunkingOutcome => ({
  chunks: [],
  normalizedText: label,
  strategy: "wholeDocument",
  totalTokens: 0,
  totalChars: 0,
});

const stubChunker = (label: string): Chunker => ({
  chunk: vi.fn(() => stubOutcome(label)),
});

describe("CompositeChunker", () => {
  it("routes 'wholeDocument' strategy to the whole-document chunker", () => {
    const wholeDocument = stubChunker("WD");
    const articleAware = stubChunker("AA");
    const composite = new CompositeChunker(articleAware, wholeDocument);
    const outcome = composite.chunk("text", settings("wholeDocument"));
    expect(outcome.normalizedText).toBe("WD");
    expect(wholeDocument.chunk).toHaveBeenCalledOnce();
    expect(articleAware.chunk).not.toHaveBeenCalled();
  });

  it("routes 'articleAware' to the article-aware chunker", () => {
    const wholeDocument = stubChunker("WD");
    const articleAware = stubChunker("AA");
    const composite = new CompositeChunker(articleAware, wholeDocument);
    const outcome = composite.chunk("text", settings("articleAware"));
    expect(outcome.normalizedText).toBe("AA");
    expect(articleAware.chunk).toHaveBeenCalledOnce();
    expect(wholeDocument.chunk).not.toHaveBeenCalled();
  });

  it("routes the deprecated 'paragraph' alias to article-aware (back-compat)", () => {
    // Pre-migration profiles on disk still carry chunking="paragraph";
    // routing those through the article-aware chunker preserves their
    // behavior since paragraph splitting is its built-in fallback.
    const wholeDocument = stubChunker("WD");
    const articleAware = stubChunker("AA");
    const composite = new CompositeChunker(articleAware, wholeDocument);
    const outcome = composite.chunk("text", settings("paragraph"));
    expect(outcome.normalizedText).toBe("AA");
  });

  it("forwards the input text and settings unchanged to the chosen chunker", () => {
    const wholeDocument = stubChunker("WD");
    const articleAware = stubChunker("AA");
    const composite = new CompositeChunker(articleAware, wholeDocument);
    const s = settings("wholeDocument", { maxChunkTokens: 250 });
    composite.chunk("payload", s);
    expect(wholeDocument.chunk).toHaveBeenCalledWith("payload", s);
  });
});
