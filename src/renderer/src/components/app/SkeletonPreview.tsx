import { useMemo, useState } from "react";
import { ChevronDown, FileType, Hash, ListTree, Quote } from "lucide-react";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { buildSkeleton } from "@shared/lib/skeleton";

export interface SkeletonPreviewProps {
  /** The parsed (or raw) text to scan. Pass null to hide the panel. */
  text: string | null;
}

/**
 * Stateless preview of the structural skeleton (sections + citations +
 * fields) the legal-skeletons profile would persist for the active
 * document. Lets the operator confirm extraction quality before
 * ingest. Pure — runs `buildSkeleton` on `text` and dedupes for display.
 *
 * Hidden only when there's no text yet. When text is present but the
 * extractor found nothing, render a dimmed 0/0/0 strip with a hint —
 * the operator needs a signal that the skeleton path was attempted,
 * not a missing panel they'd misread as "feature off."
 */
export function SkeletonPreview({ text }: SkeletonPreviewProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const skel = useMemo(
    () => (text === null ? null : buildSkeleton(text)),
    [text],
  );

  if (!skel) return null;
  const total = skel.sections.length + skel.citations.length + skel.fields.length;
  const isEmpty = total === 0;

  return (
    <section
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border px-4 py-2 text-xs transition-colors",
        isEmpty
          ? "border-border bg-secondary/30 text-muted-foreground"
          : "border-primary/40 bg-primary/5 text-foreground",
      )}
    >
      <button
        type="button"
        onClick={() => !isEmpty && setOpen((v) => !v)}
        aria-expanded={isEmpty ? undefined : open}
        disabled={isEmpty}
        className={cn(
          "flex items-center justify-between gap-2 text-left",
          isEmpty && "cursor-default",
        )}
      >
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={cn(
              "flex items-center gap-1.5 font-medium",
              isEmpty ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <FileType
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                isEmpty ? "text-muted-foreground" : "text-primary",
              )}
            />
            Skeleton
          </span>
          <Counter icon={ListTree} count={skel.sections.length} label="secs" />
          <Counter icon={Quote} count={skel.citations.length} label="citas" />
          <Counter icon={Hash} count={skel.fields.length} label="fields" />
          {isEmpty && (
            <span className="text-[11px] italic text-muted-foreground">
              {t("skeleton.emptyHint")}
            </span>
          )}
        </span>
        {!isEmpty && (
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        )}
      </button>
      {!isEmpty && open && (
        <div className="flex flex-col gap-2 pt-1">
          <SectionList sections={skel.sections} />
          <ChipRow label="Citas" items={skel.citations.map((c) => c.key)} />
          <ChipRow
            label="Fields"
            items={skel.fields.map((f) => `${f.name} · ${f.type}`)}
          />
        </div>
      )}
    </section>
  );
}

function Counter({
  icon: Icon,
  count,
  label,
}: {
  icon: typeof ListTree;
  count: number;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="font-mono">{count}</span>
      <span>{label}</span>
    </span>
  );
}

function SectionList({
  sections,
}: {
  sections: { order: number; heading: string; fieldNames: string[]; citationKeys: string[] }[];
}) {
  if (sections.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1">
      {sections.map((s) => (
        <li
          key={s.order}
          className="rounded-md border border-border bg-background/60 px-2 py-1.5 font-mono text-[11px]"
        >
          <span
            className={cn(
              "block truncate font-medium",
              s.heading ? "text-foreground" : "italic text-muted-foreground",
            )}
            title={s.heading || "(leading prose)"}
          >
            {s.heading || "(leading prose)"}
          </span>
          {(s.fieldNames.length > 0 || s.citationKeys.length > 0) && (
            <span className="mt-0.5 block text-muted-foreground">
              {s.fieldNames.length}c · {s.citationKeys.length}r
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="inline-flex items-center rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-[11px] text-foreground"
            title={item}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
