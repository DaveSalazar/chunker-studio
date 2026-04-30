import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsScopeBar } from "./SettingsScopeBar";
import type { SettingsScope } from "@/hooks/useChunkerSession";

const meta: Meta<typeof SettingsScopeBar> = {
  title: "App/SettingsScopeBar",
  component: SettingsScopeBar,
};
export default meta;

type Story = StoryObj<typeof SettingsScopeBar>;

export const Global: Story = {
  render: () => {
    const [scope, setScope] = useState<SettingsScope>("global");
    return (
      <div className="w-72">
        <SettingsScopeBar
          scope={scope}
          onScopeChange={setScope}
          hasOverride={false}
        />
      </div>
    );
  },
};

export const PerDocumentInheriting: Story = {
  render: () => (
    <div className="w-72">
      <SettingsScopeBar
        scope="perDocument"
        onScopeChange={() => {}}
        activeDocumentName="cootad-2026.pdf"
        hasOverride={false}
      />
    </div>
  ),
};

export const PerDocumentWithOverride: Story = {
  render: () => (
    <div className="w-72">
      <SettingsScopeBar
        scope="perDocument"
        onScopeChange={() => {}}
        activeDocumentName="cootad-2026.pdf"
        hasOverride
        onClearOverride={() => {}}
      />
    </div>
  ),
};
