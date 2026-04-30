import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { ManualBoundaryEditRequest } from "@shared/types";
import { chunkerClient } from "@/services/chunker-client";
import { updateDocById } from "./helpers";
import type { ChunkerSessionState } from "./types";

type SetState = Dispatch<SetStateAction<ChunkerSessionState>>;

interface RecountJob {
  docId: string;
  left: number;
  right: number;
  texts: [string, string];
}

/**
 * Drag-to-resize implementation for chunk boundaries.
 *
 * Synchronous half: clamp the new offset, slice the normalized text,
 * patch the two affected chunks' text + charCount, flip the doc into
 * manualMode. The UI reflects the change immediately.
 *
 * Async half: re-count tokens for the two chunks via the chunker worker,
 * then persist the boundary edit through the session cache. Tokens
 * flicker into place when the worker replies.
 */
export function useChunkBoundary(setState: SetState) {
  return useCallback(
    (id: string, chunkIndex: number, newOffset: number) => {
      let toRecount: RecountJob | null = null;
      setState((s) => {
        const doc = s.documents.find((d) => d.id === id);
        if (!doc || !doc.result) return s;
        const chunks = doc.result.chunks;
        const left = chunks[chunkIndex];
        const right = chunks[chunkIndex + 1];
        if (!left || !right) return s;
        // Clamp so neither chunk becomes empty.
        const min = left.startOffset + 1;
        const max = right.endOffset - 1;
        const offset = Math.max(min, Math.min(max, newOffset));
        if (offset === left.endOffset) return s; // no-op
        const text = doc.result.normalizedText;
        const newLeftText = text.slice(left.startOffset, offset);
        const newRightText = text.slice(offset, right.endOffset);
        const nextChunks = chunks.map((c, i) => {
          if (i === chunkIndex) {
            return { ...c, endOffset: offset, text: newLeftText, charCount: newLeftText.length };
          }
          if (i === chunkIndex + 1) {
            return { ...c, startOffset: offset, text: newRightText, charCount: newRightText.length };
          }
          return c;
        });
        toRecount = {
          docId: id,
          left: chunkIndex,
          right: chunkIndex + 1,
          texts: [newLeftText, newRightText],
        };
        return updateDocById(s, id, {
          manualMode: true,
          result: { ...doc.result, chunks: nextChunks },
        });
      });
      if (!toRecount) return;
      const job: RecountJob = toRecount;
      void recountAndPersist(job, setState);
    },
    [setState],
  );
}

async function recountAndPersist(job: RecountJob, setState: SetState): Promise<void> {
  let counts: number[];
  try {
    counts = await chunkerClient.countTokens(job.texts);
  } catch (err) {
    console.error("countTokens failed", err);
    return;
  }
  const persistRef: { value: ManualBoundaryEditRequest | null } = { value: null };
  setState((s) => {
    const doc = s.documents.find((d) => d.id === job.docId);
    if (!doc || !doc.result) return s;
    const chunks = doc.result.chunks.map((c, i) => {
      if (i === job.left) return { ...c, tokenCount: counts[0] };
      if (i === job.right) return { ...c, tokenCount: counts[1] };
      return c;
    });
    const totalTokens = chunks.reduce((acc, c) => acc + c.tokenCount, 0);
    if (doc.result.cacheKey) {
      persistRef.value = {
        cacheKey: doc.result.cacheKey,
        leftIndex: job.left,
        left: chunks[job.left],
        right: chunks[job.right],
      };
    }
    return updateDocById(s, job.docId, {
      result: { ...doc.result, chunks, totalTokens },
    });
  });
  if (persistRef.value) {
    chunkerClient.saveManualBoundary(persistRef.value).catch((err) => {
      console.error("saveManualBoundary failed", err);
    });
  }
}
