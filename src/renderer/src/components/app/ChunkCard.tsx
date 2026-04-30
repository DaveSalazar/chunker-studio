import { Copy, Hash, Quote } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export interface ChunkPreview {
  index: number;
  article?: string;
  heading?: string;
  text: string;
  tokenCount?: number;
  charCount?: number;
}

export interface ChunkCardProps {
  chunk: ChunkPreview;
  active?: boolean;
  /** Duplicate-group info from `findDuplicateGroups`. Undefined → not a duplicate. */
  duplicate?: { count: number };
  onClick?: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ChunkCard({
  chunk,
  active,
  duplicate,
  onClick,
  onContextMenu,
}: ChunkCardProps) {
  return (
    <button
      type="button"
      data-chunk-index={chunk.index}
      data-context-trigger={onContextMenu ? "true" : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "group flex w-full flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 text-left transition-all hover:border-primary/40 hover:bg-card",
        active && "border-primary/60 bg-primary/5 shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]",
        duplicate && !active && "border-amber-500/50 bg-amber-500/5 hover:border-amber-500/70",
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
        {duplicate && (
          <Badge
            variant="muted"
            className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-300"
            title={`${duplicate.count} chunks share this exact text`}
          >
            <Copy className="h-3 w-3" />
            ×{duplicate.count}
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
