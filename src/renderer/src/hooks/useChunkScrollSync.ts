import { useEffect, useMemo, useRef, type Ref } from "react";
import type { ListImperativeAPI } from "react-window";
import { pageForChunk } from "@/lib/pageForChunk";
import type { ChunkingResult, ParsedDocument } from "@shared/types";

/**
 * When the PDF preview's page changes, scroll the chunks panel to the
 * first chunk on that page. Skipped when the *active* chunk is already
 * on the target page — that case implies a chunk click drove the page
 * change, and the user wants the clicked chunk to stay in view rather
 * than jumping to the page's first chunk.
 *
 * Returns a list ref that the caller wires into `ChunksBody`'s `<List>`.
 */
export function useChunkScrollSync(opts: {
  result: ChunkingResult | null;
  parsed: ParsedDocument | null;
  pdfPage: number | undefined;
  activeChunkIndex: number | null;
}): Ref<ListImperativeAPI> {
  const { result, parsed, pdfPage, activeChunkIndex } = opts;
  const listRef = useRef<ListImperativeAPI>(null);
  const lastScrolledPageRef = useRef<number | null>(null);
  // Read the active chunk index out of a ref so the effect doesn't
  // re-trigger on every selection — the deps stay focused on `pdfPage`.
  const activeIdxRef = useRef(activeChunkIndex);
  activeIdxRef.current = activeChunkIndex;

  const { chunkPages, pageToFirstIdx } = useMemo(() => {
    const cp = new Map<number, number>();
    const pt = new Map<number, number>();
    if (!result || !parsed) return { chunkPages: cp, pageToFirstIdx: pt };
    const len = result.normalizedText.length;
    result.chunks.forEach((c, i) => {
      const p = pageForChunk(c, parsed, len);
      if (p === null) return;
      cp.set(i, p);
      if (!pt.has(p)) pt.set(p, i);
    });
    return { chunkPages: cp, pageToFirstIdx: pt };
  }, [result, parsed]);

  useEffect(() => {
    if (pdfPage === undefined) return;
    if (lastScrolledPageRef.current === pdfPage) return;
    const aIdx = activeIdxRef.current;
    if (aIdx !== null && result) {
      const arrayIdx = result.chunks.findIndex((c) => c.index === aIdx);
      if (arrayIdx >= 0 && chunkPages.get(arrayIdx) === pdfPage) {
        lastScrolledPageRef.current = pdfPage;
        return;
      }
    }
    const target = pageToFirstIdx.get(pdfPage);
    if (target !== undefined) {
      listRef.current?.scrollToRow({
        index: target,
        align: "start",
        behavior: "smooth",
      });
      lastScrolledPageRef.current = pdfPage;
    }
  }, [pdfPage, pageToFirstIdx, chunkPages, result]);

  return listRef;
}
