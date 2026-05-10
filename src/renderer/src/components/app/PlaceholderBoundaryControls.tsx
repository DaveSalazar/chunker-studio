import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";

const PREVIEW_MAX = 110;

export interface PlaceholderBoundaryControlsProps {
  /** Live slice of normalizedText between current start/end. */
  previewText: string;
  /** end - start (chars). */
  length: number;
  onShiftStart: (delta: number) => void;
  onShiftEnd: (delta: number) => void;
}

/**
 * Four chevron buttons + a live preview snippet of the current span.
 * Outer chevrons grow the boundary outward; inner chevrons shrink it
 * inward. Stateless — the parent owns the start/end and re-renders on
 * each nudge.
 */
export function PlaceholderBoundaryControls({
  previewText,
  length,
  onShiftStart,
  onShiftEnd,
}: PlaceholderBoundaryControlsProps) {
  const t = useT();
  return (
    <div className="rounded-md border border-border bg-secondary/40 p-2">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{t("placeholder.spanLabel")}</span>
        <span>{t("placeholder.spanCount", { count: length })}</span>
      </div>
      <div className="flex items-center gap-1">
        <NudgeButton title={t("placeholder.startExtend")} onClick={() => onShiftStart(-1)}>
          <ChevronLeft className="h-3 w-3" />
        </NudgeButton>
        <NudgeButton title={t("placeholder.startShrink")} onClick={() => onShiftStart(+1)}>
          <ChevronRight className="h-3 w-3" />
        </NudgeButton>
        <div
          className="mx-1 flex-1 truncate rounded bg-background px-2 py-1 font-mono text-[11px] text-foreground"
          title={previewText}
        >
          {trimAround(previewText) || "…"}
        </div>
        <NudgeButton title={t("placeholder.endShrink")} onClick={() => onShiftEnd(-1)}>
          <ChevronLeft className="h-3 w-3" />
        </NudgeButton>
        <NudgeButton title={t("placeholder.endExtend")} onClick={() => onShiftEnd(+1)}>
          <ChevronRight className="h-3 w-3" />
        </NudgeButton>
      </div>
    </div>
  );
}

function NudgeButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function trimAround(text: string): string {
  if (text.length <= PREVIEW_MAX) return text;
  const half = Math.floor((PREVIEW_MAX - 3) / 2);
  return `${text.slice(0, half)}…${text.slice(-half)}`;
}
