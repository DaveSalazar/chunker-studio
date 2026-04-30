import { FileBox, FileText } from "lucide-react";
import { ChunkCard } from "@/components/app/ChunkCard";
import { EmptyState } from "@/components/app/EmptyState";
import { useT } from "@/lib/i18n";
import type { DocumentLoading } from "@/hooks/useChunkerSession";
import type { DuplicateInfo } from "@/lib/duplicateChunks";
import type { ChunkingResult } from "@shared/types";

export interface ChunksBodyProps {
  result: ChunkingResult | null;
  loading: DocumentLoading;
  activeChunkIndex: number | null;
  duplicateInfo: ReadonlyMap<number, DuplicateInfo>;
  onChunkClick: (index: number) => void;
  onChunkContextMenu: (
    index: number,
  ) => (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Three render branches: unparsed empty state, "0 chunks produced"
 * empty state, or the actual scrollable list of `ChunkCard`s. Pulled
 * out of `ChunksPanel` so the panel stays focused on the surrounding
 * header / context menu / toast wiring.
 */
export function ChunksBody({
  result,
  loading,
  activeChunkIndex,
  duplicateInfo,
  onChunkClick,
  onChunkContextMenu,
}: ChunksBodyProps) {
  const t = useT();
  if (loading === "unparsed") {
    return (
      <EmptyState
        icon={FileText}
        title={t("viewer.tabParsed")}
        description={t("viewer.parsedNotReady")}
      />
    );
  }
  if ((result?.chunks.length ?? 0) === 0 && loading === "ready") {
    return (
      <EmptyState
        icon={FileBox}
        title={t("chunks.noProduced")}
        description={t("chunks.noProducedDescription")}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1">
      {result?.chunks.map((c) => {
        const dup = duplicateInfo.get(c.index);
        return (
          <ChunkCard
            key={c.index}
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
        );
      })}
    </div>
  );
}
