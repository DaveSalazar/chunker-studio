// Chunk export to disk — formats and IPC payloads.
import type { ChunkRecord } from "./chunks";

export type ExportFormat =
  | "json"
  | "jsonl"
  | "csv"
  | "markdown"
  | "plaintext";

export interface ExportRequest {
  /** Chunks to export, in display order. Already filtered (deduped). */
  chunks: ChunkRecord[];
  format: ExportFormat;
  /** Filename stem for the save dialog (extension is added per format). */
  sourceName: string;
}

export interface ExportResult {
  canceled: boolean;
  /** Absolute path the file was written to, when not canceled. */
  path?: string;
  /** Number of chunks written, when not canceled. */
  count?: number;
}
