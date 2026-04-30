import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChunkCard } from "./ChunkCard";
import { SAMPLE_CHUNKS } from "@/lib/mock";

const meta: Meta<typeof ChunkCard> = {
  title: "App/ChunkCard",
  component: ChunkCard,
};
export default meta;

type Story = StoryObj<typeof ChunkCard>;

export const Article: Story = {
  args: { chunk: SAMPLE_CHUNKS[0] },
  render: (args) => (
    <div className="w-[480px]">
      <ChunkCard {...args} />
    </div>
  ),
};

export const Active: Story = {
  args: { chunk: SAMPLE_CHUNKS[1], active: true },
  render: (args) => (
    <div className="w-[480px]">
      <ChunkCard {...args} />
    </div>
  ),
};

export const NoArticle: Story = {
  args: {
    chunk: {
      index: 12,
      text:
        "La parte actora comparece y solicita medidas cautelares respecto del inmueble identificado en la demanda, conforme al artículo 132 del COGEP.",
      tokenCount: 28,
      charCount: 144,
    },
  },
  render: (args) => (
    <div className="w-[480px]">
      <ChunkCard {...args} />
    </div>
  ),
};

export const List: Story = {
  render: () => (
    <div className="flex w-[480px] flex-col gap-2">
      {SAMPLE_CHUNKS.map((c) => (
        <ChunkCard key={c.index} chunk={c} />
      ))}
    </div>
  ),
};
