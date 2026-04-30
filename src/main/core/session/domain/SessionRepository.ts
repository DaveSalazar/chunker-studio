import type { ChunkRecord, ChunkSettings, ChunkingResult, ParsedDocument } from "../../../../shared/types";

export interface CachedParse {
  parsed: ParsedDocument;
}

export interface CachedChunking {
  result: ChunkingResult;
  settings: ChunkSettings;
  /** Indices of chunks the user has manually edited. */
  manuallyEditedIndices: number[];
}

export interface SessionRepository {
  getCachedParse(fileHash: string): Promise<CachedParse | null>;
  saveCachedParse(fileHash: string, parsed: ParsedDocument): Promise<void>;

  getCachedChunking(textHash: string, settingsHash: string): Promise<CachedChunking | null>;
  saveCachedChunking(
    textHash: string,
    settingsHash: string,
    settings: ChunkSettings,
    result: ChunkingResult,
  ): Promise<void>;

  /**
   * Persist a manual edit on two adjacent chunks. The repository overwrites
   * the stored chunks at the given indices and flags them manually_edited.
   * Used by the chunk-boundary drag flow.
   */
  saveManualBoundaryEdit(
    textHash: string,
    settingsHash: string,
    leftIndex: number,
    leftChunk: ChunkRecord,
    rightChunk: ChunkRecord,
  ): Promise<void>;
}
