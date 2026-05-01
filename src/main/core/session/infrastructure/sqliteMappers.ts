import type {
  ChunkRecord,
  ChunkingResult,
  ParsedDocument,
} from "../../../../shared/types";
import type { CachedChunking } from "../domain/SessionRepository";
import type { ChunkRow, ParsedRow, RunRow } from "./sqliteStatements";
import { safeParseSettings, safeParseStringArray } from "./sqliteSerialization";

/** Build a ParsedDocument view-model from a parsed_documents row. */
export function parsedRowToDomain(row: ParsedRow): ParsedDocument {
  return {
    path: row.path,
    name: row.name,
    extension: row.extension,
    text: row.text,
    pageCount: row.page_count ?? undefined,
    pageOffsets: safeParseNumberArray(row.page_offsets_json) ?? undefined,
    warnings: safeParseStringArray(row.warnings_json),
    ...(row.unsupported_reason === "scanned-pdf"
      ? { unsupportedReason: "scanned-pdf" as const }
      : {}),
  };
}

/** Returns null if the JSON is missing or malformed (pre-v3 cached rows). */
function safeParseNumberArray(json: string | null): number[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) && parsed.every((n) => typeof n === "number")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/** Build a CachedChunking view-model from a chunking_runs row + its chunks. */
export function runRowToDomain(run: RunRow, chunkRows: ChunkRow[]): CachedChunking {
  const chunks: ChunkRecord[] = chunkRows.map((r) => ({
    index: r.chunk_index,
    article: r.article,
    heading: r.heading,
    text: r.text,
    charCount: r.char_count,
    tokenCount: r.token_count,
    startOffset: r.start_offset,
    endOffset: r.end_offset,
  }));
  const manuallyEditedIndices = chunkRows
    .filter((r) => r.manually_edited === 1)
    .map((r) => r.chunk_index);
  const result: ChunkingResult = {
    chunks,
    totalTokens: run.total_tokens,
    totalChars: run.total_chars,
    strategy: run.strategy === "paragraph" ? "paragraph" : "article",
    normalizedText: run.normalized_text,
    estimatedCostUsd: run.estimated_cost_usd,
  };
  return {
    settings: safeParseSettings(run.settings_json),
    manuallyEditedIndices,
    result,
  };
}

/** Bind params for a single chunk row insert/update. */
export function chunkParams(
  textHash: string,
  settingsHash: string,
  chunkIndex: number,
  chunk: ChunkRecord,
): Record<string, unknown> {
  return {
    textHash,
    settingsHash,
    chunkIndex,
    article: chunk.article,
    heading: chunk.heading,
    text: chunk.text,
    charCount: chunk.charCount,
    tokenCount: chunk.tokenCount,
    startOffset: chunk.startOffset,
    endOffset: chunk.endOffset,
  };
}
