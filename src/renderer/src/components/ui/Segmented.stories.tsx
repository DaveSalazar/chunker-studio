import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Files } from "lucide-react";
import { Segmented } from "./Segmented";

const meta: Meta<typeof Segmented> = {
  title: "UI/Segmented",
  component: Segmented,
};
export default meta;

type Story = StoryObj<typeof Segmented>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<"global" | "perDocument">("global");
    return (
      <Segmented
        value={value}
        onChange={setValue}
        options={[
          {
            value: "global",
            label: (
              <>
                <Files className="h-3 w-3" /> All docs
              </>
            ),
          },
          {
            value: "perDocument",
            label: (
              <>
                <FileText className="h-3 w-3" /> This doc
              </>
            ),
          },
        ]}
      />
    );
  },
};

export const Small: Story = {
  render: () => {
    const [value, setValue] = useState<"a" | "b" | "c">("a");
    return (
      <Segmented
        size="sm"
        value={value}
        onChange={setValue}
        options={[
          { value: "a", label: "Code" },
          { value: "b", label: "Docs" },
          { value: "c", label: "Tests" },
        ]}
      />
    );
  },
};
