import {
  Fragment,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { ChunkBoundaryAdjacent } from "@/components/app/ChunkBoundaryAdjacent";
import { PlaceholderPopover } from "@/components/app/PlaceholderPopover";
import { useSelectionInRef, type SelectionInfo } from "@/hooks/useSelectionInRef";
import { cn } from "@/lib/cn";
import { buildSegments, type ChunkSegment } from "@/lib/chunkSegments";
import { defaultPlaceholderName } from "@/lib/placeholderName";
import { findPlaceholderTokens } from "@shared/lib/placeholderEngulf";
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
  /**
   * When provided, selecting text + confirming the popover wraps the
   * selection as a manual placeholder. Offsets are in normalized-text
   * (rendered) coordinates; the session mutator handles source mapping.
   */
  onMarkPlaceholder?: (normStart: number, normEnd: number, name: string) => void;
  className?: string;
}

const EMPTY_DUPLICATES: ReadonlySet<number> = new Set();
const NO_CHUNKS: ChunkRecord[] = [];

export function SourcePreview({
  text,
  chunks = NO_CHUNKS,
  activeChunkIndex = null,
  duplicateIndices = EMPTY_DUPLICATES,
  onChunkClick,
  onChunkBoundaryChange,
  onMarkPlaceholder,
  className,
}: SourcePreviewProps) {
  const segments = useMemo(() => buildSegments(text, chunks), [text, chunks]);
  const preRef = useRef<HTMLPreElement | null>(null);

  const activeRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (activeChunkIndex === null) return;
    const id = window.requestAnimationFrame(() => {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeChunkIndex]);

  // Live selection inside the <pre>; pinned copy survives focus moving
  // into the popover input. Selecting fresh text replaces the pin.
  const liveSelection = useSelectionInRef(preRef);
  const [pinned, setPinned] = useState<SelectionInfo | null>(null);
  useEffect(() => {
    if (liveSelection) setPinned(liveSelection);
  }, [liveSelection]);

  const placeholderTokens = useMemo(() => findPlaceholderTokens(text), [text]);

  return (
    <div className={cn("h-full overflow-auto", className)}>
      <pre
        ref={preRef}
        className="whitespace-pre-wrap p-5 font-mono text-[12.5px] leading-relaxed text-foreground/85"
      >
        {segments.map((seg, i) => (
          <Fragment key={i}>
            {seg.chunkIndex === null ? (
              <Gap seg={seg} />
            ) : (
              <ChunkSegmentSpan
                seg={seg}
                active={seg.chunkIndex === activeChunkIndex}
                duplicate={duplicateIndices.has(seg.chunkIndex)}
                activeRef={activeRef}
                onChunkClick={onChunkClick}
              />
            )}
            {onChunkBoundaryChange && (
              <ChunkBoundaryAdjacent
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
      {pinned && onMarkPlaceholder && (
        <PlaceholderPopover
          anchorRect={pinned.rect}
          defaultName={defaultPlaceholderName(pinned.text)}
          normalizedText={text}
          placeholderTokens={placeholderTokens}
          initialStart={pinned.normStart}
          initialEnd={pinned.normEnd}
          onConfirm={(start, end, name) => {
            onMarkPlaceholder(start, end, name);
            setPinned(null);
            window.getSelection()?.removeAllRanges();
          }}
          onCancel={() => setPinned(null)}
        />
      )}
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

interface ChunkSegmentSpanProps {
  seg: ChunkSegment;
  active: boolean;
  duplicate: boolean;
  activeRef: MutableRefObject<HTMLSpanElement | null>;
  onChunkClick?: (index: number) => void;
}

function ChunkSegmentSpanImpl({
  seg,
  active,
  duplicate,
  activeRef,
  onChunkClick,
}: ChunkSegmentSpanProps) {
  const idx = seg.chunkIndex!;
  const handleClick = onChunkClick ? () => onChunkClick(idx) : undefined;
  return (
    <span
      data-segment-start={seg.baseOffset}
      ref={active ? activeRef : undefined}
      onClick={handleClick}
      className={cn(
        "rounded-[3px] transition-colors duration-150 cursor-pointer",
        active
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

const ChunkSegmentSpan = memo(ChunkSegmentSpanImpl);
