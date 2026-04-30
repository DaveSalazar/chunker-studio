import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dropzone } from "./Dropzone";

const meta: Meta<typeof Dropzone> = {
  title: "App/Dropzone",
  component: Dropzone,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof Dropzone>;

export const Default: Story = {
  render: () => (
    <div className="w-[640px]">
      <Dropzone />
    </div>
  ),
};
