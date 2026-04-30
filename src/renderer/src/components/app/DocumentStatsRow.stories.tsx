import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocumentStatsRow } from "./DocumentStatsRow";
import type { ChunkRecord, ChunkingResult } from "@shared/types";

const meta: Meta<typeof DocumentStatsRow> = {
  title: "App/DocumentStatsRow",
  component: DocumentStatsRow,
};
export default meta;

type Story = StoryObj<typeof DocumentStatsRow>;

const articleChunk = (i: number, article: string): ChunkRecord => ({
  index: i,
  article,
  heading: `TÍTULO I: PRINCIPIOS GENERALES`,
  text: "Art. " + article + ". — texto del artículo …",
  charCount: 480 + i * 8,
  tokenCount: 130 + i,
  startOffset: i * 500,
  endOffset: (i + 1) * 500 - 1,
});

const articleResult: ChunkingResult = {
  chunks: Array.from({ length: 12 }, (_, i) => articleChunk(i, `${i + 1}`)),
  totalTokens: 1_580,
  totalChars: 5_900,
  strategy: "article",
  normalizedText: "",
  estimatedCostUsd: 0.0316,
};

export const ArticleAware: Story = {
  render: () => (
    <DocumentStatsRow
      result={articleResult}
      totals={{ documents: 1, chunks: 12, tokens: 1_580, usd: 0.0316 }}
      scope="global"
      overrideCount={0}
    />
  ),
};

export const ParagraphFallback: Story = {
  render: () => (
    <DocumentStatsRow
      result={{
        ...articleResult,
        chunks: articleResult.chunks.map((c) => ({ ...c, article: null })),
        strategy: "paragraph",
      }}
      totals={{ documents: 3, chunks: 38, tokens: 4_900, usd: 0.098 }}
      scope="perDocument"
      overrideCount={2}
    />
  ),
};

export const NoActiveDocument: Story = {
  render: () => (
    <DocumentStatsRow
      result={null}
      totals={{ documents: 0, chunks: 0, tokens: 0, usd: 0 }}
      scope="global"
      overrideCount={0}
    />
  ),
};
