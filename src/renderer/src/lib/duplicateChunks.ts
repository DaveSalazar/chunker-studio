import type { ChunkingResult, ChunkRecord } from "@shared/types";

export interface DuplicateInfo {
  /** Stable id shared by every chunk in the same duplicate group. */
  groupId: number;
  /** How many chunks (including this one) share the normalized text. */
  count: number;
}

const WHITESPACE_RE = /\s+/g;

function normalize(text: string): string {
  return text.trim().replace(WHITESPACE_RE, " ").toLowerCase();
}

/**
 * Group chunks whose normalized text matches exactly. Returns a Map keyed
 * by `chunk.index` for chunks that participate in a duplicate group of
 * size ≥ 2 and whose normalized text length is ≥ `minChars`.
 *
 * `minChars <= 0` disables detection and returns an empty Map — used to
 * turn the feature off without taking another conditional at the call
 * site.
 */
export function findDuplicateGroups(
  chunks: ReadonlyArray<ChunkRecord>,
  minChars: number,
): Map<number, DuplicateInfo> {
  if (minChars <= 0 || chunks.length === 0) return new Map();

  const buckets = new Map<string, number[]>();
  for (const chunk of chunks) {
    const norm = normalize(chunk.text);
    if (norm.length < minChars) continue;
    const list = buckets.get(norm);
    if (list) list.push(chunk.index);
    else buckets.set(norm, [chunk.index]);
  }

  const result = new Map<number, DuplicateInfo>();
  let groupId = 0;
  for (const indices of buckets.values()) {
    if (indices.length < 2) continue;
    const info: DuplicateInfo = { groupId: groupId++, count: indices.length };
    for (const idx of indices) result.set(idx, info);
  }
  return result;
}

/**
 * Drop all but the first chunk of each duplicate group from a chunking
 * result. Recomputes `totalTokens`, `totalChars`, and `estimatedCostUsd`
 * proportionally so downstream consumers (stats row, ingest cost preview)
 * see numbers that match the post-filter chunk list.
 *
 * No-op when `drop` is false, the info map is empty, or the result is
 * null — returns the input untouched so callers can use it as a pure
 * transform without conditional plumbing.
 */
export function applyDedup(
  result: ChunkingResult | null,
  duplicateInfo: ReadonlyMap<number, DuplicateInfo>,
  drop: boolean,
): ChunkingResult | null {
  if (!result || !drop || duplicateInfo.size === 0) return result;

  const seenGroups = new Set<number>();
  const chunks: ChunkRecord[] = [];
  for (const c of result.chunks) {
    const info = duplicateInfo.get(c.index);
    if (!info) {
      chunks.push(c);
      continue;
    }
    if (seenGroups.has(info.groupId)) continue;
    seenGroups.add(info.groupId);
    chunks.push(c);
  }

  if (chunks.length === result.chunks.length) return result;

  let totalTokens = 0;
  let totalChars = 0;
  for (const c of chunks) {
    totalTokens += c.tokenCount;
    totalChars += c.charCount;
  }
  const ratio = result.totalTokens > 0 ? totalTokens / result.totalTokens : 0;

  return {
    ...result,
    chunks,
    totalTokens,
    totalChars,
    estimatedCostUsd: result.estimatedCostUsd * ratio,
  };
}
