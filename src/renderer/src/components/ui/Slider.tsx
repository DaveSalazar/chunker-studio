import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  /** Optional element rendered next to the label (e.g. a help-icon tooltip). */
  hint?: ReactNode;
  onValueChange?: (value: number) => void;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    { className, value, min = 0, max = 100, step = 1, label, unit, hint, id, onValueChange, ...rest },
    ref,
  ) => {
    const reactId = useId();
    const inputId = id ?? reactId;
    const percent = ((value - min) / (max - min)) * 100;

    return (
      <div className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
        {(label || unit) && (
          // FolderEntryRow's row works at narrow sidebars because its
          // label container is `flex min-w-0 flex-1 flex-col` — `flex-1`
          // forces the container to take the remaining row width, so
          // the inner truncate has something concrete to truncate
          // against. Mirroring that here: `flex-1 min-w-0` on the
          // label container, `shrink-0` on the value span. Without
          // `flex-1`, the container sizes itself to its content and
          // never gets pressure to shrink, so the value falls off the
          // right edge of the sidebar.
          <div className="flex w-full min-w-0 items-baseline gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {label && (
                <label
                  htmlFor={inputId}
                  title={label}
                  className="min-w-0 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  {label}
                </label>
              )}
              {hint}
            </div>
            <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
              {value}
              {unit ? <span className="ml-1 text-muted-foreground">{unit}</span> : null}
            </span>
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange?.(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percent}%, hsl(var(--secondary)) ${percent}%, hsl(var(--secondary)) 100%)`,
          }}
          className={cn(
            "h-2 w-full appearance-none rounded-full outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:cursor-grab active:[&::-webkit-slider-thumb]:scale-110",
          )}
          {...rest}
        />
      </div>
    );
  },
);
Slider.displayName = "Slider";
