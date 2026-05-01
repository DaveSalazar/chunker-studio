import { memo, useCallback } from "react";
import { Copy, Hash, Quote } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

/**
 * Structural subset of a chunk that ChunkCard renders. Compatible with
 * `ChunkRecord` from `@shared/types` *and* with the lightweight fixture
 * objects in stories — neither needs to be massaged before passing in.
 */
export interface ChunkCardChunk {
  index: number;
  article?: string | null;
  heading?: string | null;
  text: string;
  tokenCount?: number;
  charCount?: number;
}

export interface ChunkCardProps {
  chunk: ChunkCardChunk;
  active?: boolean;
  /** Number of chunks in the duplicate group (if any). Plain number so
   *  React.memo's shallow-compare doesn't break on a fresh object literal. */
  duplicateCount?: number;
  /** Receives the chunk's own index — keeps the row-level closure stable. */
  onClick?: (index: number) => void;
  onContextMenu?: (
    index: number,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
}

function ChunkCardImpl({
  chunk,
  active,
  duplicateCount,
  onClick,
  onContextMenu,
}: ChunkCardProps) {
  const handleClick = useCallback(
    () => onClick?.(chunk.index),
    [onClick, chunk.index],
  );
  const handleContext = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => onContextMenu?.(chunk.index, e),
    [onContextMenu, chunk.index],
  );
  const isDuplicate = duplicateCount !== undefined && duplicateCount > 1;
  return (
    <button
      type="button"
      data-chunk-index={chunk.index}
      data-context-trigger={onContextMenu ? "true" : undefined}
      onClick={onClick ? handleClick : undefined}
      onContextMenu={onContextMenu ? handleContext : undefined}
      className={cn(
        "group flex w-full flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 text-left transition-all hover:border-primary/40 hover:bg-card",
        active && "border-primary/60 bg-primary/5 shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]",
        isDuplicate && !active && "border-amber-500/50 bg-amber-500/5 hover:border-amber-500/70",
      )}
    >
      <div className="flex items-center gap-2">
        <Badge variant="muted" className="font-mono text-[10px]">
          #{String(chunk.index).padStart(3, "0")}
        </Badge>
        {chunk.article && (
          <Badge variant="default" className="gap-1">
            <Quote className="h-3 w-3" />
            {chunk.article}
          </Badge>
        )}
        {isDuplicate && (
          <Badge
            variant="muted"
            className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-300"
            title={`${duplicateCount} chunks share this exact text`}
          >
            <Copy className="h-3 w-3" />
            ×{duplicateCount}
          </Badge>
        )}
        {chunk.heading && (
          <span className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
            {chunk.heading}
          </span>
        )}
      </div>

      <p className="line-clamp-4 text-sm leading-relaxed text-foreground/90">
        {chunk.text}
      </p>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {chunk.tokenCount !== undefined && (
          <span className="flex items-center gap-1 font-mono">
            <Hash className="h-3 w-3" /> {chunk.tokenCount} tok
          </span>
        )}
        {chunk.charCount !== undefined && (
          <span className="font-mono">{chunk.charCount} ch</span>
        )}
      </div>
    </button>
  );
}

/**
 * Memoized so a parent re-render (toast, panel resize, menu state…)
 * doesn't force every visible card to reconcile. Default shallow compare
 * works because callbacks are stable from upstream and primitive props
 * (`active`, `duplicateCount`) only change when they actually flip.
 */
export const ChunkCard = memo(ChunkCardImpl);
