import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ViewerTabs } from "./ViewerTabs";
import type { DocumentView } from "@/hooks/useChunkerSession";

const meta: Meta<typeof ViewerTabs> = {
  title: "App/ViewerTabs",
  component: ViewerTabs,
};
export default meta;

type Story = StoryObj<typeof ViewerTabs>;

export const RawSelected: Story = {
  render: () => {
    const [view, setView] = useState<DocumentView>("raw");
    return <ViewerTabs view={view} parsedEnabled onChangeView={setView} />;
  },
};

export const ParsedSelected: Story = {
  render: () => {
    const [view, setView] = useState<DocumentView>("parsed");
    return <ViewerTabs view={view} parsedEnabled onChangeView={setView} />;
  },
};

export const ParsedDisabled: Story = {
  render: () => (
    <ViewerTabs view="raw" parsedEnabled={false} onChangeView={() => {}} />
  ),
};
