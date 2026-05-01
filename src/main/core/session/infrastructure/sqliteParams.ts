// Bind-parameter shapes for the SQLite prepared statements. Each interface
// mirrors a statement's `@named` placeholders 1:1, so dropping or
// misspelling a key surfaces as a TypeScript error at the call site
// rather than a runtime "Missing named parameter" / "Too few values".

/** `(text_hash, settings_hash)` — used by every statement keyed by a chunking run. */
export interface RunKey {
  textHash: string;
  settingsHash: string;
}

export interface GetParseParams {
  fileHash: string;
}

export interface SaveParseParams {
  fileHash: string;
  path: string;
  name: string;
  extension: string;
  text: string;
  pageCount: number | null;
  pageOffsetsJson: string | null;
  warningsJson: string;
  unsupportedReason: string | null;
  accessedAt: number;
}

export interface SaveRunParams extends RunKey {
  settingsJson: string;
  totalTokens: number;
  totalChars: number;
  strategy: string;
  normalizedText: string;
  estimatedCostUsd: number;
  accessedAt: number;
}

/** Body shared by `insertChunk` and `updateChunk`. The latter hardcodes
 *  `manually_edited = 1` in SQL, so it needs no extra field; the former
 *  carries `manuallyEdited` explicitly so we can mark auto-generated
 *  chunks as 0 and merged manual-edit replays as 1. */
export interface ChunkBaseParams extends RunKey {
  chunkIndex: number;
  article: string | null;
  heading: string | null;
  text: string;
  charCount: number;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
}

export interface InsertChunkParams extends ChunkBaseParams {
  manuallyEdited: 0 | 1;
}

export type UpdateChunkParams = ChunkBaseParams;

export interface TouchRunParams extends RunKey {
  accessedAt: number;
}
