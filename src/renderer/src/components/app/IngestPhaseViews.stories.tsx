import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  IngestErrorView,
  IngestProgressView,
  IngestSuccessView,
} from "./IngestPhaseViews";

// IngestPhaseViews exports three siblings; story groups them under one
// title since the component file is the unit they belong to.
const meta: Meta = {
  title: "App/IngestPhaseViews",
};
export default meta;

type Story = StoryObj;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[520px]">{children}</div>
);

export const ProgressEmbedding: Story = {
  render: () => (
    <Frame>
      <IngestProgressView
        progress={{
          jobId: "job-1",
          phase: "embedding",
          processed: 64,
          total: 192,
          tokensSoFar: 35_400,
        }}
      />
    </Frame>
  ),
};

export const ProgressWriting: Story = {
  render: () => (
    <Frame>
      <IngestProgressView
        progress={{
          jobId: "job-1",
          phase: "writing",
          processed: 192,
          total: 192,
          tokensSoFar: 110_000,
        }}
      />
    </Frame>
  ),
};

export const Success: Story = {
  render: () => (
    <Frame>
      <IngestSuccessView
        summary={{
          jobId: "job-1",
          profileId: "legal-references",
          documentFieldValues: {},
          chunksEmbedded: 192,
          chunksDeleted: 12,
          chunksInserted: 192,
          promptTokens: 110_000,
          durationMs: 14_320,
        }}
      />
    </Frame>
  ),
};

export const ErrorMissingConfig: Story = {
  render: () => (
    <Frame>
      <IngestErrorView
        message="No OpenAI API key configured."
        missingConfig
      />
    </Frame>
  ),
};

export const ErrorRuntime: Story = {
  render: () => (
    <Frame>
      <IngestErrorView
        message='OpenAI: 429 Too Many Requests — please retry shortly.'
        missingConfig={false}
      />
    </Frame>
  ),
};
