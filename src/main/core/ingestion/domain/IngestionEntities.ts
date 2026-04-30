import type { ChunkRecord } from "../../../../shared/types";

export type IngestPhase = "embedding" | "writing" | "done";

export interface IngestRequest {
  jobId: string;
  profileId: string;
  documentFieldValues: Record<string, string>;
  chunks: ChunkRecord[];
}

export interface IngestProgress {
  jobId: string;
  phase: IngestPhase;
  /** 0..total, inclusive of total when phase flips to "writing"/"done". */
  processed: number;
  total: number;
  /** Tokens billed so far (sum across embedded batches). 0 for providers that don't report. */
  tokensSoFar: number;
}

export interface IngestSummary {
  jobId: string;
  profileId: string;
  documentFieldValues: Record<string, string>;
  chunksEmbedded: number;
  chunksDeleted: number;
  chunksInserted: number;
  promptTokens: number;
  durationMs: number;
}
