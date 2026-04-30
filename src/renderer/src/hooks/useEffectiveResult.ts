import { useMemo } from "react";
import type { ChunkSettings, ChunkingResult } from "@shared/types";
import { applyDedup, findDuplicateGroups, type DuplicateInfo } from "@/lib/duplicateChunks";

export interface EffectiveResultBundle {
  duplicateInfo: ReadonlyMap<number, DuplicateInfo>;
  duplicateIndices: ReadonlySet<number>;
  effectiveResult: ChunkingResult | null;
}

/**
 * Detect duplicates on the chunker's raw output, then optionally drop
 * them. Both the workspace (display) and the ingest dialog (payload)
 * consume `effectiveResult`, so toggling "drop duplicates" affects what
 * the user sees AND what gets embedded — they stay in sync.
 */
export function useEffectiveResult(
  rawResult: ChunkingResult | null,
  settings: ChunkSettings,
): EffectiveResultBundle {
  const duplicateInfo = useMemo(
    () => findDuplicateGroups(rawResult?.chunks ?? [], settings.duplicateMinChars),
    [rawResult?.chunks, settings.duplicateMinChars],
  );
  const duplicateIndices = useMemo(
    () => new Set(duplicateInfo.keys()),
    [duplicateInfo],
  );
  const effectiveResult = useMemo(
    () => applyDedup(rawResult, duplicateInfo, settings.dropDuplicates),
    [rawResult, duplicateInfo, settings.dropDuplicates],
  );
  return { duplicateInfo, duplicateIndices, effectiveResult };
}

export function countOverrides(docs: { overrides: unknown }[]): number {
  return docs.reduce((acc, d) => acc + (d.overrides ? 1 : 0), 0);
}
