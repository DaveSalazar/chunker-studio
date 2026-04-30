import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChunkBoundaryHandle } from "./ChunkBoundaryHandle";

const meta: Meta<typeof ChunkBoundaryHandle> = {
  title: "App/ChunkBoundaryHandle",
  component: ChunkBoundaryHandle,
};
export default meta;

type Story = StoryObj<typeof ChunkBoundaryHandle>;

const SAMPLE = "Art. 1.- Ámbito. — La presente ley regula el ejercicio de la autoridad …";

export const InlineInText: Story = {
  render: () => (
    <pre className="w-[480px] rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed">
      {SAMPLE.slice(0, 30)}
      <ChunkBoundaryHandle
        leftIndex={0}
        rightIndex={1}
        text={SAMPLE}
        min={1}
        max={SAMPLE.length - 1}
        onMove={() => {}}
      />
      {SAMPLE.slice(30)}
    </pre>
  ),
};
