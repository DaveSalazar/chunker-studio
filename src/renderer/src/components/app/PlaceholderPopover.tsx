import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PlaceholderBoundaryControls } from "@/components/app/PlaceholderBoundaryControls";
import { useT } from "@/lib/i18n";
import {
  engulfRange,
  type NormSpan,
} from "@shared/lib/placeholderEngulf";

export interface PlaceholderPopoverProps {
  /** Anchor rect in viewport coordinates — usually `range.getBoundingClientRect()`. */
  anchorRect: DOMRect;
  /** Pre-filled name for the input (typically the selection uppercased). */
  defaultName: string;
  /** The full rendered (normalized) text — sliced live as the operator nudges boundaries. */
  normalizedText: string;
  /** All `<<...>>` token spans in normalizedText — engulf safety net. */
  placeholderTokens: readonly NormSpan[];
  /** Initial selection in normalized-text coords. Operator can nudge ±1 char. */
  initialStart: number;
  initialEnd: number;
  onConfirm: (start: number, end: number, name: string) => void;
  onCancel: () => void;
}

const POPOVER_WIDTH = 360;
const POPOVER_GAP = 8;

/**
 * "Mark as placeholder" popover. Owns the operator's name input plus
 * the live boundary state — nudge buttons in the boundary controls
 * shift the start/end one char at a time so the wrapped span lands
 * exactly where the operator wants. Engulf still runs at submit time
 * (in the mutator) so a span that overlaps an existing `<<…>>` token
 * doesn't leave a fragment behind.
 */
export function PlaceholderPopover({
  anchorRect,
  defaultName,
  normalizedText,
  placeholderTokens,
  initialStart,
  initialEnd,
  onConfirm,
  onCancel,
}: PlaceholderPopoverProps) {
  const t = useT();
  const [name, setName] = useState(defaultName);
  const [userStart, setUserStart] = useState(initialStart);
  const [userEnd, setUserEnd] = useState(initialEnd);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.target instanceof Node && panel.contains(e.target)) return;
      onCancel();
    }
    document.addEventListener("mousedown", onMouseDown, true);
    return () => document.removeEventListener("mousedown", onMouseDown, true);
  }, [onCancel]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const previewText = useMemo(
    () => normalizedText.slice(userStart, userEnd),
    [normalizedText, userStart, userEnd],
  );
  const willEngulf = useMemo(
    () => engulfRange(placeholderTokens, userStart, userEnd).widened,
    [placeholderTokens, userStart, userEnd],
  );

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && userEnd > userStart;

  const top = Math.min(anchorRect.bottom + POPOVER_GAP, window.innerHeight - 220);
  const left = Math.min(
    Math.max(8, anchorRect.left),
    window.innerWidth - POPOVER_WIDTH - 8,
  );

  function shiftStart(delta: number) {
    setUserStart((s) => clamp(s + delta, 0, userEnd - 1));
  }
  function shiftEnd(delta: number) {
    setUserEnd((e) => clamp(e + delta, userStart + 1, normalizedText.length));
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t("placeholder.popoverTitle")}
      style={{
        position: "fixed",
        top,
        left,
        width: POPOVER_WIDTH,
        zIndex: 60,
      }}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-2xl outline-none animate-fade-in"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onConfirm(userStart, userEnd, trimmed);
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Tag className="h-3 w-3" />
          {t("placeholder.popoverTitle")}
        </div>
        <PlaceholderBoundaryControls
          previewText={previewText}
          length={userEnd - userStart}
          onShiftStart={shiftStart}
          onShiftEnd={shiftEnd}
        />
        {willEngulf && (
          <p className="text-[10.5px] text-amber-300">
            {t("placeholder.engulfWarning")}
          </p>
        )}
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          placeholder={t("placeholder.namePlaceholder")}
          className="h-8 text-xs font-mono uppercase"
        />
        <p className="text-[10.5px] text-muted-foreground">
          {t("placeholder.preview", { name: trimmed || "…" })}
        </p>
        <div className="mt-1 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t("placeholder.cancel")}
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {t("placeholder.confirm")}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
