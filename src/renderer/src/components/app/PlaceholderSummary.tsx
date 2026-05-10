import { useMemo, useState } from "react";
import { ChevronDown, ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { analyzePlaceholders } from "@shared/lib/placeholders";

export interface PlaceholderSummaryProps {
  /** The parsed (or raw) text to scan. Pass null to hide the panel. */
  text: string | null;
  /**
   * True when settings.normalizePlaceholders is on. Drives the badge
   * copy ("will be normalized" vs. "found"). Visual only — the panel
   * always runs the analysis so the operator can see what they'd
   * gain by flipping the toggle.
   */
  willNormalize: boolean;
}

/**
 * Stateless preview of placeholder candidates in the active document.
 * Renders a compact strip with the total count + a per-name breakdown
 * the operator can expand. Click the strip header to toggle.
 *
 * Hidden when there's no text to scan or when zero matches are found
 * — keeps the workspace from being cluttered with "0 placeholders" on
 * a code or law document where blanks aren't expected.
 */
export function PlaceholderSummary({
  text,
  willNormalize,
}: PlaceholderSummaryProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const breakdown = useMemo(() => {
    if (text === null) return null;
    const matches = analyzePlaceholders(text);
    if (matches.length === 0) return { total: 0, rows: [] as Row[] };
    const counts = new Map<string, number>();
    for (const m of matches) {
      counts.set(m.name, (counts.get(m.name) ?? 0) + 1);
    }
    const rows: Row[] = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return { total: matches.length, rows };
  }, [text]);

  if (!breakdown || breakdown.total === 0) return null;

  return (
    <section
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border px-4 py-2 text-xs transition-colors",
        willNormalize
          ? "border-primary/40 bg-primary/5 text-foreground"
          : "border-border bg-secondary/30 text-muted-foreground",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="font-medium text-foreground">
            {willNormalize
              ? t("placeholders.willNormalize", { count: breakdown.total })
              : t("placeholders.found", { count: breakdown.total })}
          </span>
          <span className="text-muted-foreground">
            {t("placeholders.distinct", { count: breakdown.rows.length })}
          </span>
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <Breakdown rows={breakdown.rows} />}
    </section>
  );
}

interface Row {
  name: string;
  count: number;
}

function Breakdown({ rows }: { rows: Row[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5 pt-1">
      {rows.map((r) => (
        <li
          key={r.name}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-[11px]"
          title={r.name}
        >
          <span className="text-foreground">{r.name}</span>
          <span className="text-muted-foreground">×{r.count}</span>
        </li>
      ))}
    </ul>
  );
}
