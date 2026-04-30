import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileBox } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Button } from "@/components/ui/Button";

const meta: Meta<typeof EmptyState> = {
  title: "App/EmptyState",
  component: EmptyState,
};
export default meta;

type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  render: () => (
    <div className="h-[320px] w-[480px]">
      <EmptyState
        icon={FileBox}
        title="No chunks produced"
        description="Try lowering the minimum chunk chars or disabling the letter-ratio filter."
        action={<Button size="sm" variant="outline">Reset settings</Button>}
      />
    </div>
  ),
};
