import type {
  ChunkRecord,
  ChunkSettings,
  ChunkingResult,
  ParsedDocument,
  SessionCacheStats,
} from "../../../../shared/types";

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

  /** Row counts per table — surfaced in the "clear cache" confirmation modal. */
  getStats(): Promise<SessionCacheStats>;

  /**
   * Wipe all cached parses, chunking runs, and chunks (including manually
   * edited ones). Schema and DB file are preserved; the file shrinks on
   * next VACUUM (not run here — operators rarely care about disk size and
   * VACUUM can't run inside the implicit txn we use for the deletes).
   */
  clearAll(): Promise<void>;
}
