import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderHeader } from "./FolderHeader";

const meta: Meta<typeof FolderHeader> = {
  title: "App/FolderHeader",
  component: FolderHeader,
};
export default meta;

type Story = StoryObj<typeof FolderHeader>;

const selection = {
  path: "/Users/jane/Documents/legal-corpus",
  name: "legal-corpus",
};

export const NoneLoaded: Story = {
  render: () => (
    <div className="w-72">
      <FolderHeader selection={selection} entryCount={42} parsedCount={0} />
    </div>
  ),
};

export const SomeLoaded: Story = {
  render: () => (
    <div className="w-72">
      <FolderHeader selection={selection} entryCount={42} parsedCount={5} />
    </div>
  ),
};

export const AllLoaded: Story = {
  render: () => (
    <div className="w-72">
      <FolderHeader selection={selection} entryCount={42} parsedCount={42} />
    </div>
  ),
};
