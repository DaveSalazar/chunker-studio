import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TooltipProps {
  /** Element that triggers the tooltip on hover/focus. */
  children: ReactNode;
  /** Tooltip body — short, plain text. */
  content: ReactNode;
  /** Side the bubble pops out on. Default `top`. */
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/**
 * CSS-only tooltip: visibility flips via `group-hover` / `group-focus-within`,
 * so no React state and no portal. Suitable for short hint text next to
 * form labels. The trigger keeps its own keyboard semantics — wrap a real
 * `<button>` for that.
 */
export function Tooltip({ children, content, side = "top", className }: TooltipProps) {
  const id = useId();
  return (
    <span className={cn("relative inline-flex group", className)}>
      <span aria-describedby={id} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-xs whitespace-normal rounded-md",
          "border border-border bg-popover px-2.5 py-1.5 text-xs leading-snug text-popover-foreground shadow-md",
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
          POSITION[side],
        )}
      >
        {content}
      </span>
    </span>
  );
}

const POSITION: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
  left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
  right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
};
