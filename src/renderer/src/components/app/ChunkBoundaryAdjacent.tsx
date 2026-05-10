import { ChunkBoundaryHandle } from "@/components/app/ChunkBoundaryHandle";
import type { ChunkSegment } from "@/lib/chunkSegments";
import type { ChunkRecord } from "@shared/types";

export interface ChunkBoundaryAdjacentProps {
  left: ChunkSegment;
  right: ChunkSegment | undefined;
  chunks: ChunkRecord[];
  text: string;
  onChange: (leftArrayIndex: number, newOffset: number) => void;
}

/**
 * Renders a drag handle between two adjacent chunk segments. Returns
 * null whenever the boundary is degenerate (right segment missing, or
 * either side is a gap). Pulled out of SourcePreview so the parent
 * stays under the project's 180-line component cap.
 */
export function ChunkBoundaryAdjacent({
  left,
  right,
  chunks,
  text,
  onChange,
}: ChunkBoundaryAdjacentProps) {
  if (!right || left.arrayIndex === null || right.arrayIndex === null) {
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
