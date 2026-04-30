import type { Meta, StoryObj } from "@storybook/react-vite";
import { Hash, Layers, ScanText } from "lucide-react";
import { StatBlock } from "./StatBlock";

const meta: Meta<typeof StatBlock> = {
  title: "App/StatBlock",
  component: StatBlock,
};
export default meta;

type Story = StoryObj<typeof StatBlock>;

export const Grid: Story = {
  render: () => (
    <div className="grid w-[640px] grid-cols-3 gap-3">
      <StatBlock icon={Layers} label="Chunks" value={847} />
      <StatBlock icon={Hash} label="Tokens" value="184,210" hint="~$0.0037 on 3-small" />
      <StatBlock icon={ScanText} label="Article-based" value="847/847" hint="Article-aware split" />
    </div>
  ),
};
