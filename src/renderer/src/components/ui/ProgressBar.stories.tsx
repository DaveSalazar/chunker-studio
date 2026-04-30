import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProgressBar } from "./ProgressBar";

const meta: Meta<typeof ProgressBar> = {
  title: "UI/ProgressBar",
  component: ProgressBar,
};
export default meta;

type Story = StoryObj<typeof ProgressBar>;

export const Determinate: Story = {
  render: () => {
    const [v, setV] = useState(0);
    useEffect(() => {
      const id = window.setInterval(
        () => setV((x) => (x >= 100 ? 0 : x + 7)),
        300,
      );
      return () => window.clearInterval(id);
    }, []);
    return (
      <div className="flex w-72 flex-col gap-2">
        <span className="font-mono text-xs">{v}%</span>
        <ProgressBar value={v} />
      </div>
    );
  },
};

export const Indeterminate: Story = {
  render: () => (
    <div className="w-72">
      <ProgressBar />
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <ProgressBar value={45} />
      <ProgressBar value={70} tone="success" />
      <ProgressBar value={90} tone="warning" />
    </div>
  ),
};
