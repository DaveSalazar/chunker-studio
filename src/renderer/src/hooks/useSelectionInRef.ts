import { useEffect, useState, type RefObject } from "react";

export interface SelectionInfo {
  /** Plain text of the live selection. */
  text: string;
  /** Absolute offsets into the rendered (normalized) text. */
  normStart: number;
  normEnd: number;
  /** Bounding rect in viewport coordinates — for popover positioning. */
  rect: DOMRect;
}

/**
 * Walks up from a (text) node to the nearest ancestor element that
 * carries a `data-segment-start` attribute (set by SourcePreview on
 * every span) and returns the absolute offset in the rendered text.
 *
 * Each segment is rendered as `<span data-segment-start={baseOffset}>{seg.text}</span>`,
 * so the immediate parent of the text node holds the base offset and
 * `offsetInNode` (offset within the text node) is the local position.
 */
function offsetForNode(
  node: Node,
  offsetInNode: number,
  container: HTMLElement,
): number | null {
  let el: Node | null = node;
  while (el && el !== container && el !== document.body) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const v = (el as HTMLElement).dataset?.segmentStart;
      if (v !== undefined) {
        const base = Number.parseInt(v, 10);
        if (Number.isFinite(base)) return base + offsetInNode;
      }
    }
    el = el.parentNode;
  }
  return null;
}

/**
 * Tracks the live text selection inside `containerRef`. Returns null
 * whenever the selection is collapsed, lives outside the container, or
 * lacks a resolvable offset. The consumer decides whether to "pin" the
 * selection (so it survives focus moving into a popover input) — this
 * hook only reports what the browser currently has selected.
 */
export function useSelectionInRef(
  containerRef: RefObject<HTMLElement | null>,
): SelectionInfo | null {
  const [info, setInfo] = useState<SelectionInfo | null>(null);

  useEffect(() => {
    function recompute() {
      const container = containerRef.current;
      if (!container) {
        setInfo(null);
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setInfo(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (
        !container.contains(range.startContainer) ||
        !container.contains(range.endContainer)
      ) {
        setInfo(null);
        return;
      }
      const startOffset = offsetForNode(
        range.startContainer,
        range.startOffset,
        container,
      );
      const endOffset = offsetForNode(
        range.endContainer,
        range.endOffset,
        container,
      );
      if (startOffset === null || endOffset === null) {
        setInfo(null);
        return;
      }
      const text = sel.toString();
      if (text.length === 0) {
        setInfo(null);
        return;
      }
      setInfo({
        text,
        normStart: Math.min(startOffset, endOffset),
        normEnd: Math.max(startOffset, endOffset),
        rect: range.getBoundingClientRect(),
      });
    }
    document.addEventListener("selectionchange", recompute);
    return () => document.removeEventListener("selectionchange", recompute);
  }, [containerRef]);

  return info;
}
