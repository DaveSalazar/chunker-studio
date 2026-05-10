import { useMemo } from "react";
import { Files, Hash, ListTree, Quote } from "lucide-react";
import { StatBlock } from "@/components/app/StatBlock";
import { useT } from "@/lib/i18n";
import { buildSkeleton, type Skeleton } from "@shared/lib/skeleton";

export interface SkeletonStatsRowProps {
  /**
   * Active doc's parsed text — drives the per-active-doc skeleton
   * counters. Pass null for the no-doc / unparsed case; the row still
   * renders so the layout above the workspace doesn't shift on tab
   * switch.
   */
  text: string | null;
  /** Total documents in the session — same datum as DocumentStatsRow. */
  documentCount: number;
}

/**
 * Stats row for skeleton mode (chunkingStrategy === "wholeDocument").
 * Replaces the chunk-shaped DocumentStatsRow whose Tokens / Article-based
 * blocks read wrong when there's a single skeleton row per doc. Counters
 * here are scoped to the active doc — there is no "totals across all
 * docs" because the skeleton hasn't been persisted yet, only previewed.
 */
export function SkeletonStatsRow({ text, documentCount }: SkeletonStatsRowProps) {
  const t = useT();
  const skel = useMemo<Skeleton | null>(
    () => (text === null ? null : buildSkeleton(text)),
    [text],
  );
  const sections = skel?.sections.length ?? 0;
  const citations = skel?.citations.length ?? 0;
  const fields = skel?.fields.length ?? 0;
  const sectionsWithHeading = skel
    ? skel.sections.filter((s) => s.heading.length > 0).length
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatBlock
        icon={Files}
        label={t("stats.documents")}
        value={documentCount}
        hint={t("skeleton.stats.modeBadge")}
      />
      <StatBlock
        icon={ListTree}
        label={t("skeleton.stats.sections")}
        value={sections}
        hint={t("skeleton.stats.sectionsHint", { count: sectionsWithHeading })}
      />
      <StatBlock
        icon={Quote}
        label={t("skeleton.stats.citations")}
        value={citations}
        hint={t("skeleton.stats.citationsHint", { count: citations })}
      />
      <StatBlock
        icon={Hash}
        label={t("skeleton.stats.fields")}
        value={fields}
        hint={t("skeleton.stats.fieldsHint", { count: fields })}
      />
    </div>
  );
}
