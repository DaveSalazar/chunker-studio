import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps {
  checked: boolean;
  /** Tri-state: when true, renders the dash glyph regardless of `checked`. */
  indeterminate?: boolean;
  onChange: () => void;
  /** Caller supplies a label for screen readers; the checkbox itself has no
   *  visible text since it always sits next to a clickable row that already
   *  describes the entry. */
  ariaLabel: string;
  className?: string;
}

export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  className,
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  // `indeterminate` is a property, not an HTML attribute — must be set
  // imperatively. React doesn't track it via props.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      // Stop propagation so a checkbox inside a clickable row (folder
      // header, file row) doesn't also fire the row's onClick.
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      className={cn(
        "h-3.5 w-3.5 shrink-0 cursor-pointer accent-primary",
        className,
      )}
    />
  );
}
