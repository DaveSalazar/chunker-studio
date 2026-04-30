import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderActions } from "./FolderActions";

const meta: Meta<typeof FolderActions> = {
  title: "App/FolderActions",
  component: FolderActions,
};
export default meta;

type Story = StoryObj<typeof FolderActions>;

const noop = () => {};

export const SelectionExpanded: Story = {
  render: () => (
    <FolderActions
      hasSelection
      collapsed={false}
      loading="idle"
      onRefresh={noop}
      onCloseFolder={noop}
      onToggleCollapsed={noop}
    />
  ),
};

export const Listing: Story = {
  render: () => (
    <FolderActions
      hasSelection
      collapsed={false}
      loading="listing"
      onRefresh={noop}
      onCloseFolder={noop}
      onToggleCollapsed={noop}
    />
  ),
};

export const Collapsed: Story = {
  render: () => (
    <FolderActions
      hasSelection
      collapsed
      loading="idle"
      onRefresh={noop}
      onCloseFolder={noop}
      onToggleCollapsed={noop}
    />
  ),
};

export const NoSelection: Story = {
  render: () => (
    <FolderActions
      hasSelection={false}
      collapsed={false}
      loading="idle"
      onRefresh={noop}
      onCloseFolder={noop}
      onToggleCollapsed={noop}
    />
  ),
};
