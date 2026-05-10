import { useState } from "react";
import { AlertTriangle, ChevronDown, Hash, Quote } from "lucide-react";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";

export interface SkeletonSectionCardProps {
  /** 0-based document order — rendered as `#1`, `#2`, … */
  order: number;
  heading: string;
  citationKeys: string[];
  fieldNames: string[];
  /**
   * Verbatim source body for this section. Hidden behind a disclosure
   * because the audit-only label matters: this is precisely the prose
   * the skeleton flow keeps OUT of the LLM's view at draft time.
   */
  body: string;
}

/**
 * One row in the SkeletonPanel. Shows section heading + citation/field
 * chip rows, with an audit-tagged disclosure for the source body.
 * Stateless except for the per-card body toggle.
 */
export function SkeletonSectionCard({
  order,
  heading,
  citationKeys,
  fieldNames,
  body,
}: SkeletonSectionCardProps) {
  const t = useT();
  const [bodyOpen, setBodyOpen] = useState(false);
  const hasBody = body.trim().length > 0;
  const displayHeading = heading || t("skeleton.panel.leadingProse");

  return (
    <article className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3 text-xs">
      <header className="flex items-baseline justify-between gap-2">
        <h4 className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            #{order + 1}
          </span>
          <span
            className={cn(
              "min-w-0 truncate font-medium",
              heading ? "text-foreground" : "italic text-muted-foreground",
            )}
            title={heading || undefined}
          >
            {displayHeading}
          </span>
        </h4>
        <CountBadges citations={citationKeys.length} fields={fieldNames.length} />
      </header>

      <ChipRow
        label={t("skeleton.panel.sectionCitations")}
        emptyLabel={t("skeleton.panel.noCitations")}
        items={citationKeys}
        tone="citation"
      />
      <ChipRow
        label={t("skeleton.panel.sectionFields")}
        emptyLabel={t("skeleton.panel.noFields")}
        items={fieldNames}
        tone="field"
      />

      <button
        type="button"
        onClick={() => setBodyOpen((v) => !v)}
        aria-expanded={bodyOpen}
        disabled={!hasBody}
        className={cn(
          "flex items-center gap-1.5 self-start rounded-md text-[11px] text-muted-foreground transition-colors",
          hasBody ? "hover:text-foreground" : "cursor-default opacity-50",
        )}
      >
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", bodyOpen && "rotate-180")}
        />
        {bodyOpen ? t("skeleton.panel.hideBody") : t("skeleton.panel.showBody")}
      </button>
      {bodyOpen && hasBody && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-300">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>{t("skeleton.panel.bodyAuditNotice")}</span>
          </div>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background/80 p-2 font-mono text-[11px] text-muted-foreground">
            {body}
          </pre>
        </div>
      )}
    </article>
  );
}

function CountBadges({
  citations,
  fields,
}: {
  citations: number;
  fields: number;
}) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <Quote className="h-3 w-3" />
        <span className="font-mono">{citations}</span>
      </span>
      <span className="flex items-center gap-1">
        <Hash className="h-3 w-3" />
        <span className="font-mono">{fields}</span>
      </span>
    </span>
  );
}

function ChipRow({
  label,
  emptyLabel,
  items,
  tone,
}: {
  label: string;
  emptyLabel: string;
  items: string[];
  tone: "citation" | "field";
}) {
  const Icon = tone === "citation" ? Quote : Hash;
  if (items.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-[10px] italic text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        <span>{emptyLabel}</span>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px]",
              tone === "citation"
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-border bg-background/60 text-foreground",
            )}
            title={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
