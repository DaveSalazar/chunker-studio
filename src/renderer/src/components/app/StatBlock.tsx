import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StatBlockProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}

export function StatBlock({ icon: Icon, label, value, hint, className }: StatBlockProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 overflow-hidden rounded-xl border border-border bg-card/60 p-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
      <span className="truncate font-mono text-2xl font-semibold tabular-nums">
        {value}
      </span>
      {hint && (
        <span className="truncate text-[11px] text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}
