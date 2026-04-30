import type { Meta, StoryObj } from "@storybook/react-vite";
import { ManualEditsBar } from "./ManualEditsBar";

const meta: Meta<typeof ManualEditsBar> = {
  title: "App/ManualEditsBar",
  component: ManualEditsBar,
};
export default meta;

type Story = StoryObj<typeof ManualEditsBar>;

export const Default: Story = {
  render: () => <ManualEditsBar onResetToAuto={() => {}} />,
};
