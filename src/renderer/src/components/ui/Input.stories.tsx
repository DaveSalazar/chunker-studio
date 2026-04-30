import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./Input";
import { Label } from "./Label";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Search documents…" },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="src">Source path</Label>
      <Input id="src" placeholder="s3://bucket/textract-cache" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, value: "Read-only", readOnly: true },
};
