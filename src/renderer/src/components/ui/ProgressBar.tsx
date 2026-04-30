import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  /** 0..100 — clamp + round happens internally. Pass `undefined` for indeterminate. */
  value?: number;
  className?: string;
  tone?: "primary" | "success" | "warning";
}

const TONE: Record<NonNullable<ProgressBarProps["tone"]>, string> = {
  primary: "bg-primary",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
};

export function ProgressBar({ value, className, tone = "primary" }: ProgressBarProps) {
  const indeterminate = value === undefined;
  const clamped =
    value === undefined ? 0 : Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
    >
      {indeterminate ? (
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-1/3 animate-[progress-indeterminate_1.2s_ease-in-out_infinite] rounded-full",
            TONE[tone],
          )}
        />
      ) : (
        <span
          style={{ width: `${clamped}%` }}
          className={cn("block h-full rounded-full transition-[width] duration-200", TONE[tone])}
        />
      )}
    </div>
  );
}
