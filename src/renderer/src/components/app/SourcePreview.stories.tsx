import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SourcePreview } from "./SourcePreview";
import { Card, CardContent } from "@/components/ui/Card";
import { SAMPLE_CHUNK_RECORDS, SAMPLE_TEXT } from "@/lib/mock";

const meta: Meta<typeof SourcePreview> = {
  title: "App/SourcePreview",
  component: SourcePreview,
};
export default meta;

type Story = StoryObj<typeof SourcePreview>;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <Card className="h-[480px] w-[640px] overflow-hidden">
      <CardContent className="h-full p-0">{children}</CardContent>
    </Card>
  );
}

export const Plain: Story = {
  render: () => (
    <Frame>
      <SourcePreview text={SAMPLE_TEXT} />
    </Frame>
  ),
};

export const HighlightedChunks: Story = {
  render: () => (
    <Frame>
      <SourcePreview text={SAMPLE_TEXT} chunks={SAMPLE_CHUNK_RECORDS} />
    </Frame>
  ),
};

export const ActiveChunk: Story = {
  render: () => {
    const [active, setActive] = useState<number | null>(2);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Click a highlight or pick:</span>
          {SAMPLE_CHUNK_RECORDS.map((c) => (
            <button
              key={c.index}
              onClick={() => setActive(c.index)}
              className={`rounded-full border px-2 py-0.5 ${
                active === c.index
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border"
              }`}
            >
              #{c.index} {c.article}
            </button>
          ))}
        </div>
        <Frame>
          <SourcePreview
            text={SAMPLE_TEXT}
            chunks={SAMPLE_CHUNK_RECORDS}
            activeChunkIndex={active}
            onChunkClick={setActive}
          />
        </Frame>
      </div>
    );
  },
};
