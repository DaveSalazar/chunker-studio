import { useCallback } from "react";
import { pageForChunk } from "@/lib/pageForChunk";
import type { ChunkerSession, DocumentEntry } from "@/hooks/useChunkerSession";
import type { ChunkingResult } from "@shared/types";

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
  return useCallback(
    (index: number | null) => {
      setActiveChunkIndex(index);
      if (index === null || !activeDoc || !effectiveResult) return;
      const chunk = effectiveResult.chunks.find((c) => c.index === index);
      if (!chunk) return;
      const page = pageForChunk(
        chunk,
        activeDoc.parsed,
        effectiveResult.normalizedText.length,
      );
      if (page !== null) setPdfPage(activeDoc.id, page);
    },
    [setActiveChunkIndex, activeDoc, effectiveResult, setPdfPage],
  );
}
