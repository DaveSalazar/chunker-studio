import { GripVertical } from "lucide-react";
import { PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/cn";

export interface ResizeHandleProps {
  /** Show a grip icon centred on the handle. Off by default for a thin divider look. */
  withHandle?: boolean;
  className?: string;
}

/**
 * Thin vertical separator that grows a coloured stripe + grip dot when
 * hovered or dragging. Wraps `react-resizable-panels`'
 * `PanelResizeHandle` so the rest of the codebase doesn't import the
 * library directly.
 */
export function ResizeHandle({ withHandle = false, className }: ResizeHandleProps) {
  return (
    <PanelResizeHandle
      className={cn(
        "group relative flex w-1.5 shrink-0 items-center justify-center bg-transparent outline-none transition-colors",
        "hover:bg-primary/20 data-[resize-handle-state=drag]:bg-primary/40",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors",
          "group-hover:bg-primary/60 group-data-[resize-handle-state=drag]:bg-primary",
        )}
      />
      {withHandle && (
        <span
          className={cn(
            "relative z-[1] flex h-6 w-3 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground shadow-sm transition-colors",
            "group-hover:border-primary/50 group-hover:text-primary",
            "group-data-[resize-handle-state=drag]:border-primary group-data-[resize-handle-state=drag]:text-primary",
          )}
        >
          <GripVertical className="h-3 w-3" />
        </span>
      )}
    </PanelResizeHandle>
  );
}
