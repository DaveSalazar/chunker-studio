import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConnectionTestBanner } from "./ConnectionTestBanner";

const meta: Meta<typeof ConnectionTestBanner> = {
  title: "App/ConnectionTestBanner",
  component: ConnectionTestBanner,
};
export default meta;

type Story = StoryObj<typeof ConnectionTestBanner>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[420px]">{children}</div>
);

export const Idle: Story = {
  render: () => (
    <Frame>
      <span className="text-xs text-muted-foreground">
        (idle renders nothing)
      </span>
      <ConnectionTestBanner state={{ kind: "idle" }} />
    </Frame>
  ),
};

export const Testing: Story = {
  render: () => (
    <Frame>
      <ConnectionTestBanner state={{ kind: "testing" }} />
    </Frame>
  ),
};

export const Ok: Story = {
  render: () => (
    <Frame>
      <ConnectionTestBanner
        state={{
          kind: "ok",
          version: "PostgreSQL 16.2 on aarch64-apple-darwin",
          durationMs: 84,
        }}
      />
    </Frame>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <Frame>
      <ConnectionTestBanner
        state={{
          kind: "error",
          message: 'connect ECONNREFUSED 127.0.0.1:5432',
        }}
      />
    </Frame>
  ),
};
