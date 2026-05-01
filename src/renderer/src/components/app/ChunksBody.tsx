import type { Ref } from "react";
import { FileBox, FileText } from "lucide-react";
import {
  List,
  type ListImperativeAPI,
  type RowComponentProps,
} from "react-window";
import { ChunkCard } from "@/components/app/ChunkCard";
import { EmptyState } from "@/components/app/EmptyState";
import { useT } from "@/lib/i18n";
import type { DocumentLoading } from "@/hooks/useChunkerSession";
import type { DuplicateInfo } from "@/lib/duplicateChunks";
import type { ChunkRecord, ChunkingResult } from "@shared/types";

// ChunkCard with `line-clamp-4` averages ~200px tall; the extra 8px is
// the visual gap that used to come from the parent's `gap-2`. Since
// react-window absolutely positions rows, we bake the gap into the row
// height and let each row pad itself.
const ROW_HEIGHT = 208;

export interface ChunksBodyProps {
  result: ChunkingResult | null;
  loading: DocumentLoading;
  activeChunkIndex: number | null;
  duplicateInfo: ReadonlyMap<number, DuplicateInfo>;
  onChunkClick: (index: number) => void;
  onChunkContextMenu: (
    index: number,
  ) => (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Forwarded to react-window so the parent can call `.scrollToRow(...)`
   * — used by the PDF page → chunks-panel auto-scroll.
   */
  listRef?: Ref<ListImperativeAPI>;
}

interface RowProps {
  chunks: ChunkRecord[];
  activeChunkIndex: number | null;
  duplicateInfo: ReadonlyMap<number, DuplicateInfo>;
  onChunkClick: (index: number) => void;
  onChunkContextMenu: (
    index: number,
  ) => (event: React.MouseEvent<HTMLButtonElement>) => void;
}

function Row({
  index,
  style,
  chunks,
  activeChunkIndex,
  duplicateInfo,
  onChunkClick,
  onChunkContextMenu,
}: RowComponentProps<RowProps>) {
  const c = chunks[index];
  if (!c) return null;
  const dup = duplicateInfo.get(c.index);
  return (
    <div style={style} className="pb-2 pr-1">
      <ChunkCard
        chunk={{
          index: c.index,
          article: c.article ?? undefined,
          heading: c.heading ?? undefined,
          text: c.text,
          tokenCount: c.tokenCount,
          charCount: c.charCount,
        }}
        active={c.index === activeChunkIndex}
        duplicate={dup ? { count: dup.count } : undefined}
        onClick={() => onChunkClick(c.index)}
        onContextMenu={onChunkContextMenu(c.index)}
      />
    </div>
  );
}

/**
 * Three render branches: unparsed empty state, "0 chunks produced"
 * empty state, or the virtualized list of `ChunkCard`s. Virtualization
 * keeps mount cost flat regardless of doc size — a 2,500-chunk corpus
 * mounts the same ~30 cards as a 50-chunk doc.
 */
export function ChunksBody({
  result,
  loading,
  activeChunkIndex,
  duplicateInfo,
  onChunkClick,
  onChunkContextMenu,
  listRef,
}: ChunksBodyProps) {
  const t = useT();
  const chunks = result?.chunks ?? [];
  if (loading === "unparsed") {
    return (
      <EmptyState
        icon={FileText}
        title={t("viewer.tabParsed")}
        description={t("viewer.parsedNotReady")}
      />
    );
  }
  if (chunks.length === 0 && loading === "ready") {
    return (
      <EmptyState
        icon={FileBox}
        title={t("chunks.noProduced")}
        description={t("chunks.noProducedDescription")}
      />
    );
  }
  return (
    <List<RowProps>
      className="min-h-0 flex-1"
      listRef={listRef}
      rowComponent={Row}
      rowCount={chunks.length}
      rowHeight={ROW_HEIGHT}
      rowProps={{
        chunks,
        activeChunkIndex,
        duplicateInfo,
        onChunkClick,
        onChunkContextMenu,
      }}
      overscanCount={3}
    />
  );
}
