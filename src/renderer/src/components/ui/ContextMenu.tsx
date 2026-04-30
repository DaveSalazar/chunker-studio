import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface ContextMenuPosition {
  /** Viewport-relative cursor coordinates from `MouseEvent.clientX/Y`. */
  x: number;
  y: number;
}

export interface ContextMenuProps {
  open: boolean;
  position: ContextMenuPosition | null;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Tiny portaled context menu. Closes on Escape, on left-click pointer
 * events outside the menu, and on right-click anywhere that is not a
 * registered trigger (so the next right-click on a different trigger
 * swaps the menu without first being closed by this listener).
 *
 * Trigger convention: any element whose React `onContextMenu` handler
 * updates the parent's menu state must mark itself (or a wrapper) with
 * `data-context-trigger="true"`. Without that, the global contextmenu
 * listener here would race React's synthetic dispatch and close the menu
 * the React handler is in the middle of opening.
 */
export function ContextMenu({
  open,
  position,
  onClose,
  children,
  className,
}: ContextMenuProps) {
  useEffect(() => {
    if (!open) return;
    const isInsideMenu = (target: Element | null) =>
      target?.closest?.("[data-context-menu='true']") != null;
    const isTrigger = (target: Element | null) =>
      target?.closest?.("[data-context-trigger='true']") != null;

    const onMouseDown = (e: MouseEvent) => {
      // Skip right-button mousedown — the matching `contextmenu` event
      // is what replaces or closes the menu. Closing here would race
      // React's `onContextMenu` handler on the new trigger.
      if (e.button === 2) return;
      const target = e.target as Element | null;
      if (isInsideMenu(target)) return;
      onClose();
    };
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (isInsideMenu(target)) return;
      // Another trigger? Its React handler will replace the menu state —
      // don't close out from under it.
      if (isTrigger(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !position || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-context-menu="true"
      role="menu"
      style={{ top: position.y, left: position.x }}
      className={cn(
        "fixed z-50 min-w-[180px] overflow-hidden rounded-md border border-border bg-card p-1 shadow-xl outline-none animate-fade-in",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

export interface ContextMenuItemProps {
  onSelect: () => void;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  children: ReactNode;
}

export function ContextMenuItem({
  onSelect,
  icon,
  shortcut,
  disabled,
  children,
}: ContextMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      // Use `mousedown` to fire before the parent's outside-click handler
      // sees the click and closes the menu out from under us.
      onMouseDown={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSelect();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-xs transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : "text-foreground hover:bg-secondary",
      )}
    >
      {icon && <span className="flex h-3.5 w-3.5 items-center justify-center text-muted-foreground">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && (
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {shortcut}
        </span>
      )}
    </button>
  );
}
