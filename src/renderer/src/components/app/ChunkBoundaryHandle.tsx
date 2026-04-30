import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  clampBoundary,
  pointToOffset,
  snapToWordBoundary,
} from "@/lib/chunkBoundary";
import { useT } from "@/lib/i18n";

export interface ChunkBoundaryHandleProps {
  /** Index of the LEFT chunk; the boundary sits at chunks[leftIndex].endOffset. */
  leftIndex: number;
  rightIndex: number;
  /** Doc text — used for word-boundary snapping. */
  text: string;
  /** Inclusive lower bound on the new boundary position (left.startOffset+1). */
  min: number;
  /** Inclusive upper bound on the new boundary position (right.endOffset-1). */
  max: number;
  onMove: (offset: number) => void;
}

/**
 * Inline grip rendered between two adjacent chunk segments. Pointer
 * capture during drag means the handle keeps receiving moves even when
 * the cursor leaves its (1px) hit area.
 */
export function ChunkBoundaryHandle({
  leftIndex,
  rightIndex,
  text,
  min,
  max,
  onMove,
}: ChunkBoundaryHandleProps) {
  const t = useT();
  const dragging = useRef(false);

  const handleFromPoint = (x: number, y: number) => {
    const raw = pointToOffset(x, y);
    if (raw === null) return;
    const snapped = snapToWordBoundary(text, raw);
    onMove(clampBoundary(snapped, min, max));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    handleFromPoint(e.clientX, e.clientY);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <button
      type="button"
      aria-label={t("viewer.boundaryHandleLabel", {
        left: leftIndex + 1,
        right: rightIndex + 1,
      })}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        // Inline so it sits in the text flow at the boundary point.
        "inline-flex h-4 w-1 select-none items-center justify-center align-middle",
        "mx-px cursor-ew-resize rounded-sm bg-primary/40 text-primary",
        "hover:bg-primary hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
      // Stop the surrounding <pre> from starting a text selection.
      style={{ touchAction: "none" }}
    >
      <GripVertical className="h-3 w-3 -mx-1 pointer-events-none" />
    </button>
  );
}
