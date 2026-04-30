import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConnectionsActions } from "./ConnectionsActions";

const meta: Meta<typeof ConnectionsActions> = {
  title: "App/ConnectionsActions",
  component: ConnectionsActions,
};
export default meta;

type Story = StoryObj<typeof ConnectionsActions>;

const baseProps = {
  databaseUrl: "postgres://localhost:5432/legal",
  onTest: () => {},
  onSave: () => {},
};

export const Idle: Story = {
  render: () => (
    <ConnectionsActions
      {...baseProps}
      savingState="idle"
      testState={{ kind: "idle" }}
      error={null}
    />
  ),
};

export const Testing: Story = {
  render: () => (
    <ConnectionsActions
      {...baseProps}
      savingState="idle"
      testState={{ kind: "testing" }}
      error={null}
    />
  ),
};

export const Saved: Story = {
  render: () => (
    <ConnectionsActions
      {...baseProps}
      savingState="saved"
      testState={{ kind: "idle" }}
      error={null}
    />
  ),
};

export const ErroredEmpty: Story = {
  render: () => (
    <ConnectionsActions
      {...baseProps}
      databaseUrl=""
      savingState="idle"
      testState={{ kind: "idle" }}
      error="Database URL is required"
    />
  ),
};
