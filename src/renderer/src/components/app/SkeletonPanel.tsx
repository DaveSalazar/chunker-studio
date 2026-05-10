import { useMemo } from "react";
import { CloudUpload, FileBox, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonSectionCard } from "@/components/app/SkeletonSectionCard";
import { useT } from "@/lib/i18n";
import {
  buildSkeleton,
  extractSectionBodies,
  type Skeleton,
} from "@shared/lib/skeleton";
import type { DocumentLoading } from "@/hooks/useChunkerSession";

export interface SkeletonPanelProps {
  /** Active doc's parsed text. Null when nothing is loaded yet. */
  text: string | null;
  loading: DocumentLoading;
  /** Called when the operator clicks Ingest. Same wiring as ChunksPanel. */
  onIngest: () => void;
}

/**
 * Right-pane view for skeleton mode (chunkingStrategy === "wholeDocument").
 * Replaces the chunks list — which is just one giant chunk in this mode —
 * with a structural preview of the row that would land in the `skeletons`
 * table: numbered section cards, per-section citation/field chips, and
 * an opt-in "show source body" disclosure per card so the operator can
 * sanity-check boundary detection. Pure render of `buildSkeleton` over
 * the parsed text — no chunker IPC, no state beyond the section cards.
 */
export function SkeletonPanel({ text, loading, onIngest }: SkeletonPanelProps) {
  const t = useT();
  const skel = useMemo<Skeleton | null>(
    () => (text === null ? null : buildSkeleton(text)),
    [text],
  );
  const bodies = useMemo<string[]>(
    () => (text === null ? [] : extractSectionBodies(text)),
    [text],
  );
  const isLoading = loading === "parsing" || loading === "chunking";
  const sectionCount = skel?.sections.length ?? 0;
  const totalDetected = skel
    ? skel.sections.length + skel.citations.length + skel.fields.length
    : 0;
  const isEmpty = skel !== null && totalDetected === 0;

  return (
    <div className="relative flex h-full flex-col gap-3 overflow-hidden pl-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <span>{t("skeleton.panel.title")}</span>
            <span className="text-muted-foreground">({sectionCount})</span>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {t("skeleton.panel.subtitle")}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          disabled={!skel || isEmpty || isLoading}
          onClick={onIngest}
          title={t("ingest.buttonTooltip")}
        >
          <CloudUpload />
          {t("ingest.button")}
        </Button>
      </div>

      <SkeletonBody
        skel={skel}
        bodies={bodies}
        loading={loading}
        isEmpty={isEmpty}
      />
    </div>
  );
}

function SkeletonBody({
  skel,
  bodies,
  loading,
  isEmpty,
}: {
  skel: Skeleton | null;
  bodies: string[];
  loading: DocumentLoading;
  isEmpty: boolean;
}) {
  const t = useT();
  if (loading === "unparsed" || skel === null) {
    return (
      <EmptyState
        icon={FileText}
        title={t("skeleton.panel.unparsedTitle")}
        description={t("skeleton.panel.unparsedDescription")}
      />
    );
  }
  if (isEmpty) {
    return (
      <EmptyState
        icon={FileBox}
        title={t("skeleton.panel.emptyTitle")}
        description={t("skeleton.panel.emptyDescription")}
      />
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
      {skel.sections.map((s) => (
        <SkeletonSectionCard
          key={s.order}
          order={s.order}
          heading={s.heading}
          citationKeys={s.citationKeys}
          fieldNames={s.fieldNames}
          body={bodies[s.order] ?? ""}
        />
      ))}
    </div>
  );
}
