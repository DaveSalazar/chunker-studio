import { HelpCircle } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tooltip } from "./Tooltip";

const meta: Meta<typeof Tooltip> = {
  title: "UI/Tooltip",
  component: Tooltip,
};
export default meta;

type Story = StoryObj<typeof Tooltip>;

export const HelpIcon: Story = {
  render: () => (
    <div className="flex items-center gap-2 pt-12">
      <span className="text-sm">Max chunk tokens</span>
      <Tooltip content="Hard ceiling on tokens per chunk. The chunker emits a new chunk before this is exceeded.">
        <button
          type="button"
          aria-label="What is this?"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-12 py-16">
      {(["top", "bottom", "left", "right"] as const).map((side) => (
        <Tooltip key={side} content={`Pops on ${side}`} side={side}>
          <button
            type="button"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs"
          >
            {side}
          </button>
        </Tooltip>
      ))}
    </div>
  ),
};
