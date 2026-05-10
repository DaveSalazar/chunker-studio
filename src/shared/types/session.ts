// Session-cache stats surfaced to the renderer for the
// "clear cache" confirmation dialog. Counts come straight from
// SELECT COUNT(*) over the SQLite cache tables.

export interface SessionCacheStats {
  parsedDocuments: number;
  chunkingRuns: number;
  chunks: number;
  /**
   * Subset of `chunks` whose `manually_edited` flag is set. Surfaced
   * separately so the modal can warn the user that the wipe will lose
   * boundary edits they made by hand.
   */
  manuallyEditedChunks: number;
}
