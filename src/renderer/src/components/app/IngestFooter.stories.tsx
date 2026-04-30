import type { Meta, StoryObj } from "@storybook/react-vite";
import { IngestFooter } from "./IngestFooter";

const meta: Meta<typeof IngestFooter> = {
  title: "App/IngestFooter",
  component: IngestFooter,
};
export default meta;

type Story = StoryObj<typeof IngestFooter>;

const handlers = {
  onStart: () => {},
  onClose: () => {},
  onRetry: () => {},
  onOpenSettings: () => {},
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-end gap-2 rounded-md border border-border bg-card/40 p-3">
    {children}
  </div>
);

export const Idle: Story = {
  render: () => (
    <Frame>
      <IngestFooter phase={{ kind: "idle" }} canStart {...handlers} />
    </Frame>
  ),
};

export const IdleDisabled: Story = {
  render: () => (
    <Frame>
      <IngestFooter
        phase={{ kind: "idle" }}
        canStart={false}
        {...handlers}
      />
    </Frame>
  ),
};

export const Running: Story = {
  render: () => (
    <Frame>
      <IngestFooter
        phase={{
          kind: "running",
          progress: {
            jobId: "job-1",
            phase: "embedding",
            processed: 64,
            total: 192,
            tokensSoFar: 25_000,
          },
        }}
        canStart={false}
        {...handlers}
      />
    </Frame>
  ),
};

export const Done: Story = {
  render: () => (
    <Frame>
      <IngestFooter
        phase={{
          kind: "done",
          summary: {
            jobId: "job-1",
            profileId: "default",
            documentFieldValues: {},
            chunksEmbedded: 192,
            chunksDeleted: 0,
            chunksInserted: 192,
            promptTokens: 0,
            durationMs: 14_320,
          },
        }}
        canStart={false}
        {...handlers}
      />
    </Frame>
  ),
};

export const ErrorMissingConfig: Story = {
  render: () => (
    <Frame>
      <IngestFooter
        phase={{
          kind: "error",
          message: "Missing OpenAI API key.",
          missingConfig: true,
        }}
        canStart={false}
        {...handlers}
      />
    </Frame>
  ),
};

export const ErrorRetryable: Story = {
  render: () => (
    <Frame>
      <IngestFooter
        phase={{
          kind: "error",
          message: "Connection reset.",
          missingConfig: false,
        }}
        canStart={false}
        {...handlers}
      />
    </Frame>
  ),
};
