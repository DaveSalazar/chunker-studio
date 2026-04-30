import type { ChunkRecord } from "./chunks";

export type IngestPhase = "embedding" | "writing" | "done";

export interface IngestProgress {
  jobId: string;
  phase: IngestPhase;
  processed: number;
  total: number;
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

export interface IngestStartRequest {
  jobId: string;
  profileId: string;
  documentFieldValues: Record<string, string>;
  chunks: ChunkRecord[];
}
