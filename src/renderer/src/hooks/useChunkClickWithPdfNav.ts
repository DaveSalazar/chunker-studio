import { useCallback, useMemo } from "react";
import { pageForChunk } from "@/lib/pageForChunk";
import type { ChunkerSession, DocumentEntry } from "@/hooks/useChunkerSession";
import type { ChunkRecord, ChunkingResult } from "@shared/types";

/**
 * Returns a chunk-click handler that highlights the chunk *and* navigates
 * the active doc's PDF preview to its page. Page lookup is best-effort
 * (proportional offset mapping); silent no-op when `pageOffsets` are
 * missing on the parsed doc (non-PDF source or pre-v3 cached parse).
 */
export function useChunkClickWithPdfNav(
  setActiveChunkIndex: (index: number | null) => void,
  activeDoc: DocumentEntry | null,
  effectiveResult: ChunkingResult | null,
  setPdfPage: ChunkerSession["setPdfPage"],
) {
  // O(1) lookup so the click handler doesn't linear-scan thousands of
  // chunks. The map is rebuilt only when the underlying chunks change
  // (re-chunk, dedup toggle, settings change).
  const chunkByIndex = useMemo(() => {
    const m = new Map<number, ChunkRecord>();
    if (effectiveResult) for (const c of effectiveResult.chunks) m.set(c.index, c);
    return m;
  }, [effectiveResult]);

  return useCallback(
    (index: number | null) => {
      setActiveChunkIndex(index);
      if (index === null || !activeDoc || !effectiveResult) return;
      const chunk = chunkByIndex.get(index);
      if (!chunk) return;
      const page = pageForChunk(
        chunk,
        activeDoc.parsed,
        effectiveResult.normalizedText.length,
      );
      if (page !== null) setPdfPage(activeDoc.id, page);
    },
    [setActiveChunkIndex, activeDoc, effectiveResult, chunkByIndex, setPdfPage],
  );
}
