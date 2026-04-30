import { useCallback, useMemo, useRef } from "react";
import { Copy } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { DuplicateInfo } from "@/lib/duplicateChunks";
import type { ChunkRecord } from "@shared/types";

export interface DuplicateJumpPillProps {
  chunks: ReadonlyArray<ChunkRecord>;
  duplicateInfo: ReadonlyMap<number, DuplicateInfo>;
  onChunkClick: (index: number) => void;
}

/**
 * Header pill that surfaces the duplicate count and cycles the chunks
 * panel through every duplicate chunk on each click. Hidden when no
 * duplicates are detected. Cursor is local — re-mounts (e.g. doc
 * switch) reset to the first match.
 */
export function DuplicateJumpPill({
  chunks,
  duplicateInfo,
  onChunkClick,
}: DuplicateJumpPillProps) {
  const t = useT();
  const order = useMemo(
    () => chunks.filter((c) => duplicateInfo.has(c.index)).map((c) => c.index),
    [chunks, duplicateInfo],
  );
  const cursor = useRef(-1);

  const jumpNext = useCallback(() => {
    if (order.length === 0) return;
    cursor.current = (cursor.current + 1) % order.length;
    const idx = order[cursor.current];
    onChunkClick(idx);
    // Defer one frame so the click's state update commits before the
    // browser scrolls — avoids fighting React's render.
    window.requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-chunk-index="${idx}"]`,
      ) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [order, onChunkClick]);

  if (order.length === 0) return null;
  return (
    <button
      type="button"
      onClick={jumpNext}
      title={t("chunks.jumpToDuplicate")}
      className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300 transition-colors hover:border-amber-500/70 hover:bg-amber-500/25"
    >
      <Copy className="h-3 w-3" />
      {t("chunks.duplicates", { count: order.length })}
    </button>
  );
}
