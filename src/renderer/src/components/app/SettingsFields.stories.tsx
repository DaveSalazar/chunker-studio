import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsFields } from "./SettingsFields";
import { DEFAULT_CHUNK_SETTINGS, type ChunkSettings } from "@shared/types";

const meta: Meta<typeof SettingsFields> = {
  title: "App/SettingsFields",
  component: SettingsFields,
};
export default meta;

type Story = StoryObj<typeof SettingsFields>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<ChunkSettings>(DEFAULT_CHUNK_SETTINGS);
    return (
      <div className="w-72">
        <SettingsFields value={value} onChange={(p) => setValue({ ...value, ...p })} />
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-72">
      <SettingsFields
        value={DEFAULT_CHUNK_SETTINGS}
        onChange={() => {}}
        disabled
      />
    </div>
  ),
};

export const ParagraphMode: Story = {
  render: () => {
    const [value, setValue] = useState<ChunkSettings>({
      ...DEFAULT_CHUNK_SETTINGS,
      splitByArticle: false,
      maxChunkTokens: 800,
    });
    return (
      <div className="w-72">
        <SettingsFields value={value} onChange={(p) => setValue({ ...value, ...p })} />
      </div>
    );
  },
};
