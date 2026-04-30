import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizeHandle,
} from "./ResizablePanels";

// `ResizablePanels.tsx` is a re-export module wrapping `react-resizable-panels`
// so component code imports panels from one place. ResizeHandle has its own
// dedicated story; this file demonstrates the vertical group + autoSaveId
// patterns the app uses (Sidebar / DocumentWorkspace).
const meta: Meta<typeof ResizablePanelGroup> = {
  title: "UI/ResizablePanels",
  component: ResizablePanelGroup,
};
export default meta;

type Story = StoryObj<typeof ResizablePanelGroup>;

const Pane = ({ label }: { label: string }) => (
  <div className="flex h-full items-center justify-center rounded-md border border-border bg-card/40 text-xs text-muted-foreground">
    {label}
  </div>
);

export const Vertical: Story = {
  render: () => (
    <div className="h-[420px] w-[420px]">
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={35} minSize={15}>
          <Pane label="Settings" />
        </ResizablePanel>
        <ResizeHandle withHandle />
        <ResizablePanel defaultSize={65} minSize={20}>
          <Pane label="Folder" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};

export const PersistedLayout: Story = {
  render: () => (
    <div className="h-[320px] w-[720px]">
      <ResizablePanelGroup direction="horizontal" autoSaveId="story.persisted">
        <ResizablePanel defaultSize={25}>
          <Pane label="Sidebar" />
        </ResizablePanel>
        <ResizeHandle withHandle />
        <ResizablePanel defaultSize={75}>
          <Pane label="Workspace" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};
