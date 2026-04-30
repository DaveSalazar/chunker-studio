import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider } from "./Slider";

const meta: Meta<typeof Slider> = {
  title: "UI/Slider",
  component: Slider,
};
export default meta;

type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(500);
    return (
      <div className="w-80">
        <Slider
          label="Max chunk tokens"
          unit="tok"
          min={100}
          max={1500}
          step={50}
          value={value}
          onValueChange={setValue}
        />
      </div>
    );
  },
};

export const Percent: Story = {
  render: () => {
    const [value, setValue] = useState(40);
    return (
      <div className="w-80">
        <Slider
          label="Letter ratio"
          unit="%"
          min={0}
          max={100}
          step={5}
          value={value}
          onValueChange={setValue}
        />
      </div>
    );
  },
};
