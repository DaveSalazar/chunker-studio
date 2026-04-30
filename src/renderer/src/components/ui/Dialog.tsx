import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Prevent closing on backdrop click + ESC. */
  modal?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Tiny portaled modal. Not a Radix wrapper — we don't have radix in the
 * dep tree and a single dialog use-case doesn't warrant adding it.
 *
 * Behaviour:
 *   - Renders into document.body so it floats above resizable panels.
 *   - ESC closes (unless `modal`).
 *   - Backdrop click closes (unless `modal`).
 *   - Focus moves to the dialog on open; ESC + focus return to the
 *     element that triggered it (browser default after re-render).
 *   - Body scroll is locked while a dialog is open.
 */
export function Dialog({
  open,
  onOpenChange,
  modal = false,
  className,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !modal) {
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, modal, onOpenChange]);

  // Focus the panel on open so screen readers + keyboard nav land in it.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => ref.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const onBackdropClick = useCallback(() => {
    if (!modal) onOpenChange(false);
  }, [modal, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        aria-hidden
        onClick={onBackdropClick}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
      />
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          "relative z-[1] flex max-h-[85vh] w-[min(560px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none animate-fade-in",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({
  title,
  description,
  onClose,
}: {
  title: ReactNode;
  description?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border p-5 pb-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold leading-tight">{title}</h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-secondary hover:text-foreground",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </header>
  );
}

export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 overflow-y-auto p-5", className)}>{children}</div>
  );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border bg-secondary/30 p-4",
        className,
      )}
    >
      {children}
    </footer>
  );
}
