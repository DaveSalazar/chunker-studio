import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsPanel, DEFAULT_SETTINGS, type ChunkSettings } from "./SettingsPanel";
import type { SettingsScope } from "@/hooks/useChunkerSession";

const meta: Meta<typeof SettingsPanel> = {
  title: "App/SettingsPanel",
  component: SettingsPanel,
};
export default meta;

type Story = StoryObj<typeof SettingsPanel>;

export const SingleDocument: Story = {
  render: () => {
    const [value, setValue] = useState<ChunkSettings>(DEFAULT_SETTINGS);
    return (
      <div className="w-[340px]">
        <SettingsPanel value={value} onChange={setValue} />
      </div>
    );
  },
};

export const GlobalScope: Story = {
  render: () => {
    const [value, setValue] = useState<ChunkSettings>(DEFAULT_SETTINGS);
    const [scope, setScope] = useState<SettingsScope>("global");
    return (
      <div className="w-[340px]">
        <SettingsPanel
          value={value}
          onChange={setValue}
          scope={scope}
          onScopeChange={setScope}
          activeDocumentName="codigo-civil-cc-09-02-2026.pdf"
        />
      </div>
    );
  },
};

export const PerDocumentInheriting: Story = {
  render: () => {
    const [value, setValue] = useState<ChunkSettings>(DEFAULT_SETTINGS);
    const [scope, setScope] = useState<SettingsScope>("perDocument");
    return (
      <div className="w-[340px]">
        <SettingsPanel
          value={value}
          onChange={setValue}
          scope={scope}
          onScopeChange={setScope}
          activeDocumentName="codigo-civil-cc-09-02-2026.pdf"
          hasOverride={false}
        />
      </div>
    );
  },
};

export const PerDocumentWithOverride: Story = {
  render: () => {
    const [value, setValue] = useState<ChunkSettings>({
      ...DEFAULT_SETTINGS,
      maxChunkTokens: 800,
      letterRatio: 30,
    });
    const [scope, setScope] = useState<SettingsScope>("perDocument");
    const [hasOverride, setHasOverride] = useState(true);
    return (
      <div className="w-[340px]">
        <SettingsPanel
          value={value}
          onChange={setValue}
          scope={scope}
          onScopeChange={setScope}
          activeDocumentName="demanda-divorcio-template.docx"
          hasOverride={hasOverride}
          onClearOverride={() => {
            setHasOverride(false);
            setValue(DEFAULT_SETTINGS);
          }}
        />
      </div>
    );
  },
};

export const NoDocuments: Story = {
  render: () => (
    <div className="w-[340px]">
      <SettingsPanel
        value={DEFAULT_SETTINGS}
        onChange={() => {}}
        scope="global"
        onScopeChange={() => {}}
        disabled
      />
    </div>
  ),
};
