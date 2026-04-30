import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChunksPanel } from "./ChunksPanel";
import type { ChunkRecord, ChunkingResult } from "@shared/types";

const meta: Meta<typeof ChunksPanel> = {
  title: "App/ChunksPanel",
  component: ChunksPanel,
};
export default meta;

type Story = StoryObj<typeof ChunksPanel>;

const chunk = (i: number): ChunkRecord => ({
  index: i,
  article: `${i + 1}`,
  heading: "TÍTULO I: PRINCIPIOS GENERALES",
  text:
    `Art. ${i + 1}.- Principios.- El ejercicio de la autoridad y las potestades públicas se regirá por los siguientes principios: a) Unidad …`,
  charCount: 240 + i * 4,
  tokenCount: 90 + i,
  startOffset: i * 500,
  endOffset: (i + 1) * 500 - 1,
});

const result: ChunkingResult = {
  chunks: Array.from({ length: 6 }, (_, i) => chunk(i)),
  totalTokens: 612,
  totalChars: 1_870,
  strategy: "article",
  normalizedText: "",
  estimatedCostUsd: 0.012,
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[520px] w-[420px] rounded-md border border-border bg-card/40 p-3">
    {children}
  </div>
);

export const Loaded: Story = {
  render: () => (
    <Frame>
      <ChunksPanel
        result={result}
        loading="ready"
        activeChunkIndex={2}
        onChunkClick={() => {}}
        onIngest={() => {}}
      />
    </Frame>
  ),
};

export const EmptyUnparsed: Story = {
  render: () => (
    <Frame>
      <ChunksPanel
        result={null}
        loading="unparsed"
        activeChunkIndex={null}
        onChunkClick={() => {}}
        onIngest={() => {}}
      />
    </Frame>
  ),
};

export const ZeroProduced: Story = {
  render: () => (
    <Frame>
      <ChunksPanel
        result={{ ...result, chunks: [] }}
        loading="ready"
        activeChunkIndex={null}
        onChunkClick={() => {}}
        onIngest={() => {}}
      />
    </Frame>
  ),
};
