import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderEmpty } from "./FolderEmpty";

const meta: Meta<typeof FolderEmpty> = {
  title: "App/FolderEmpty",
  component: FolderEmpty,
};
export default meta;

type Story = StoryObj<typeof FolderEmpty>;

export const Default: Story = {
  render: () => (
    <div className="w-72">
      <FolderEmpty onSelectFolder={() => {}} />
    </div>
  ),
};
