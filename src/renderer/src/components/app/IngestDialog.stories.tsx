import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { IngestDialog } from "./IngestDialog";
import { Button } from "@/components/ui/Button";
import type { ChunkRecord } from "@shared/types";

const meta: Meta<typeof IngestDialog> = {
  title: "App/IngestDialog",
  component: IngestDialog,
};
export default meta;

type Story = StoryObj<typeof IngestDialog>;

const SAMPLE_CHUNKS: ChunkRecord[] = Array.from({ length: 847 }).map((_, i) => ({
  index: i + 1,
  article: `Art. ${i + 1}`,
  heading: null,
  text: `Cuerpo del artículo ${i + 1}…`,
  charCount: 200,
  tokenCount: 50,
  startOffset: 0,
  endOffset: 200,
}));

export const Form: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <IngestDialog
          open={open}
          onOpenChange={setOpen}
          documentName="codigo-civil-2026.pdf"
          chunks={SAMPLE_CHUNKS}
          estimatedTokens={184_210}
          onOpenSettings={() => {}}
        />
      </>
    );
  },
};
