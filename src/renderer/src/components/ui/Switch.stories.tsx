import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./Switch";

const meta: Meta<typeof Switch> = {
  title: "UI/Switch",
  component: Switch,
};
export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  render: () => {
    const [on, setOn] = useState(true);
    return (
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={on} onCheckedChange={setOn} />
        Dehyphenate line breaks
      </label>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <Switch checked disabled />
  ),
};
