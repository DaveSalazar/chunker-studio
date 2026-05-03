import { inject, injectable } from "inversify";
import { ChunkingLocator } from "../domain/ChunkingLocator";
import type { Chunker } from "../domain/Chunker";
import type { ChunkSettings, ChunkingOutcome } from "../domain/ChunkingEntities";

/**
 * Routes chunk requests to the right component chunker based on
 * `settings.chunkingStrategy`. Anything that isn't explicitly
 * "wholeDocument" — including the deprecated "paragraph" alias and
 * the default "articleAware" — falls through to ArticleAwareChunker,
 * which itself decides article vs paragraph fallback at runtime.
 *
 * Bound as `ChunkingLocator.Chunker` so callers (the use case, the
 * worker pool, tests) interact with a single Chunker entrypoint.
 */
@injectable()
export class CompositeChunker implements Chunker {
  constructor(
    @inject(ChunkingLocator.ArticleAwareChunker)
    private readonly articleAware: Chunker,
    @inject(ChunkingLocator.WholeDocumentChunker)
    private readonly wholeDocument: Chunker,
  ) {}

  chunk(rawText: string, settings: ChunkSettings): ChunkingOutcome {
    if (settings.chunkingStrategy === "wholeDocument") {
      return this.wholeDocument.chunk(rawText, settings);
    }
    return this.articleAware.chunk(rawText, settings);
  }
}
