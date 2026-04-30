import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizeHandle,
} from "./ResizablePanels";

const meta: Meta<typeof ResizeHandle> = {
  title: "UI/ResizeHandle",
  component: ResizeHandle,
};
export default meta;

type Story = StoryObj<typeof ResizeHandle>;

const Pane = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center rounded-md border border-border bg-card/40 text-sm text-muted-foreground">
    {label}
  </div>
);

export const ThinDivider: Story = {
  render: () => (
    <div className="h-[320px] w-[640px]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={15}>
          <Pane label="Left" />
        </ResizablePanel>
        <ResizeHandle />
        <ResizablePanel defaultSize={70} minSize={25}>
          <Pane label="Right" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const WithGrip: Story = {
  render: () => (
    <div className="h-[320px] w-[640px]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={45} minSize={20}>
          <Pane label="Source" />
        </ResizablePanel>
        <ResizeHandle withHandle />
        <ResizablePanel defaultSize={55} minSize={20}>
          <Pane label="Chunks" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const ThreePanels: Story = {
  render: () => (
    <div className="h-[320px] w-[800px]">
      <ResizablePanelGroup direction="horizontal" autoSaveId="story.three">
        <ResizablePanel defaultSize={20} minSize={10}>
          <Pane label="Settings" />
        </ResizablePanel>
        <ResizeHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={20}>
          <Pane label="Source preview" />
        </ResizablePanel>
        <ResizeHandle withHandle />
        <ResizablePanel defaultSize={30} minSize={15}>
          <Pane label="Chunks" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};
