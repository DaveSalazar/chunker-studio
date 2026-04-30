import { Fragment, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { ChunkBoundaryHandle } from "@/components/app/ChunkBoundaryHandle";
import { cn } from "@/lib/cn";
import { buildSegments, type ChunkSegment } from "@/lib/chunkSegments";
import type { ChunkRecord } from "@shared/types";

export interface SourcePreviewProps {
  text: string;
  chunks?: ChunkRecord[];
  /** Index of the chunk to render in the "selected" colour and scroll into view. */
  activeChunkIndex?: number | null;
  /** Set of chunk indices flagged by the duplicate detector — rendered with an amber tint. */
  duplicateIndices?: ReadonlySet<number>;
  onChunkClick?: (index: number) => void;
  /**
   * When provided, drag handles are rendered between adjacent chunks.
   * Called with the LEFT chunk's array index and the new boundary offset.
   */
  onChunkBoundaryChange?: (leftArrayIndex: number, newOffset: number) => void;
  className?: string;
}

/**
 * Renders the parsed (normalized) text with chunk-aware highlighting.
 * Chrome-less by design — the parent owns the card/header. When
 * `onChunkBoundaryChange` is provided, drag handles appear between
 * adjacent chunks for manual re-slicing.
 */
const EMPTY_DUPLICATES: ReadonlySet<number> = new Set();

export function SourcePreview({
  text,
  chunks = [],
  activeChunkIndex = null,
  duplicateIndices = EMPTY_DUPLICATES,
  onChunkClick,
  onChunkBoundaryChange,
  className,
}: SourcePreviewProps) {
  const segments = useMemo(
    () => buildSegments(text, chunks, activeChunkIndex),
    [text, chunks, activeChunkIndex],
  );

  const activeRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (activeChunkIndex === null) return;
    const id = window.requestAnimationFrame(() => {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeChunkIndex]);

  return (
    <div className={cn("h-full overflow-auto", className)}>
      <pre className="whitespace-pre-wrap p-5 font-mono text-[12.5px] leading-relaxed text-foreground/85">
        {segments.map((seg, i) => (
          <Fragment key={i}>
            {seg.chunkIndex === null ? (
              <Gap seg={seg} />
            ) : (
              <ChunkSegmentSpan
                seg={seg}
                activeRef={activeRef}
                duplicate={duplicateIndices.has(seg.chunkIndex)}
                onChunkClick={onChunkClick}
              />
            )}
            {onChunkBoundaryChange && (
              <Boundary
                left={seg}
                right={segments[i + 1]}
                chunks={chunks}
                text={text}
                onChange={onChunkBoundaryChange}
              />
            )}
          </Fragment>
        ))}
      </pre>
    </div>
  );
}

function Gap({ seg }: { seg: ChunkSegment }) {
  return (
    <span data-segment-start={seg.baseOffset} className="text-muted-foreground/50">
      {seg.text}
    </span>
  );
}

function ChunkSegmentSpan({
  seg,
  activeRef,
  duplicate = false,
  onChunkClick,
}: {
  seg: ChunkSegment;
  activeRef: MutableRefObject<HTMLSpanElement | null>;
  duplicate?: boolean;
  onChunkClick?: (index: number) => void;
}) {
  const idx = seg.chunkIndex!;
  return (
    <span
      data-segment-start={seg.baseOffset}
      ref={seg.active ? activeRef : undefined}
      onClick={() => onChunkClick?.(idx)}
      className={cn(
        "rounded-[3px] transition-colors duration-150 cursor-pointer",
        seg.active
          ? "bg-primary/35 text-foreground ring-1 ring-primary/70 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
          : duplicate
            ? "bg-amber-500/20 text-foreground hover:bg-amber-500/30 ring-1 ring-amber-500/40"
            : "bg-primary/10 text-foreground hover:bg-primary/20",
      )}
    >
      {seg.text}
    </span>
  );
}

function Boundary({
  left,
  right,
  chunks,
  text,
  onChange,
}: {
  left: ChunkSegment;
  right: ChunkSegment | undefined;
  chunks: ChunkRecord[];
  text: string;
  onChange: (leftArrayIndex: number, newOffset: number) => void;
}) {
  if (
    !right ||
    left.arrayIndex === null ||
    right.arrayIndex === null
  ) {
    return null;
  }
  const leftChunk = chunks[left.arrayIndex];
  const rightChunk = chunks[right.arrayIndex];
  if (!leftChunk || !rightChunk) return null;
  return (
    <ChunkBoundaryHandle
      leftIndex={left.arrayIndex}
      rightIndex={right.arrayIndex}
      text={text}
      min={leftChunk.startOffset + 1}
      max={rightChunk.endOffset - 1}
      onMove={(offset) => onChange(left.arrayIndex!, offset)}
    />
  );
}
