import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./Label";
import { Input } from "./Input";

const meta: Meta<typeof Label> = {
  title: "UI/Label",
  component: Label,
};
export default meta;

type Story = StoryObj<typeof Label>;

export const Default: Story = {
  render: () => <Label>Database URL</Label>,
};

export const WithInput: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-1.5">
      <Label htmlFor="db-url">Database URL</Label>
      <Input id="db-url" placeholder="postgres://localhost:5432/legal" />
    </div>
  ),
};
