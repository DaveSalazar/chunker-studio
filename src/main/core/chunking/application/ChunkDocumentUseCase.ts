import { inject, injectable } from "inversify";
import { ChunkingLocator } from "../domain/ChunkingLocator";
import type { Chunker } from "../domain/Chunker";
import type { ChunkSettings, ChunkingOutcome } from "../domain/ChunkingEntities";

@injectable()
export class ChunkDocumentUseCase {
  constructor(
    @inject(ChunkingLocator.Chunker)
    private readonly chunker: Chunker,
  ) {}

  execute(text: string, settings: ChunkSettings): ChunkingOutcome {
    return this.chunker.chunk(text, settings);
  }
}
