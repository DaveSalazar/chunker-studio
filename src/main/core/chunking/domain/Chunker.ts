import type { ChunkSettings, ChunkingOutcome } from "./ChunkingEntities";

export interface Chunker {
  chunk(rawText: string, settings: ChunkSettings): ChunkingOutcome;
}
