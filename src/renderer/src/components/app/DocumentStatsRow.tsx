import { Files, Hash, Layers, ScanText } from "lucide-react";
import { StatBlock } from "@/components/app/StatBlock";
import { useT } from "@/lib/i18n";
import type { ChunkingResult } from "@shared/types";
import type { SettingsScope } from "@/hooks/useChunkerSession";

export interface DocumentStatsRowProps {
  result: ChunkingResult | null;
  totals: { documents: number; chunks: number; tokens: number; usd: number };
  scope: SettingsScope;
  overrideCount: number;
}

export function DocumentStatsRow({
  result,
  totals,
  scope,
  overrideCount,
}: DocumentStatsRowProps) {
  const t = useT();
  const chunkCount = result?.chunks.length ?? 0;
  const articleChunks = result?.chunks.filter((c) => c.article).length ?? 0;
  const strategy = result?.strategy;

  const strategyLabel = strategy
    ? strategy === "article"
      ? t("stats.strategyArticle")
      : t("stats.strategyParagraph")
    : null;

  const articleHint =
    chunkCount > 0 && articleChunks === chunkCount
      ? t("stats.articleAware")
      : strategy === "paragraph"
        ? t("stats.paragraphFallback")
        : t("stats.mixed");

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatBlock
        icon={Files}
        label={t("stats.documents")}
        value={totals.documents}
        hint={
          scope === "global"
            ? t("stats.sharedSettings")
            : t("stats.overridesCount", { count: overrideCount })
        }
      />
      <StatBlock
        icon={Layers}
        label={t("stats.chunks")}
        value={chunkCount}
        hint={
          strategyLabel
            ? `${strategyLabel} · ${t("stats.chunksTotal", { count: totals.chunks.toLocaleString() })}`
            : t("stats.chunksTotal", { count: totals.chunks.toLocaleString() })
        }
      />
      <StatBlock
        icon={Hash}
        label={t("stats.tokens")}
        value={(result?.totalTokens ?? 0).toLocaleString()}
        hint={
          result
            ? t("stats.activeAndAll", {
                value: result.estimatedCostUsd.toFixed(4),
                total: totals.usd.toFixed(4),
              })
            : t("stats.onAll", { value: totals.tokens.toLocaleString() })
        }
      />
      <StatBlock
        icon={ScanText}
        label={t("stats.articleBased")}
        value={`${articleChunks}/${chunkCount}`}
        hint={articleHint}
      />
    </div>
  );
}
