import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sidebar } from "./Sidebar";
import { DEFAULT_CHUNK_SETTINGS, type ChunkSettings, type FolderEntry } from "@shared/types";
import type { SettingsScope } from "@/hooks/useChunkerSession";

const meta: Meta<typeof Sidebar> = {
  title: "App/Sidebar",
  component: Sidebar,
};
export default meta;

type Story = StoryObj<typeof Sidebar>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[720px] w-[340px]">{children}</div>
);

const baseHandlers = {
  onSelectFolder: () => {},
  onCloseFolder: () => {},
  onRefreshFolder: () => {},
  onParseAllEntries: () => {},
};

export const NoFolderNoDocs: Story = {
  render: () => {
    const [settings, setSettings] = useState<ChunkSettings>(DEFAULT_CHUNK_SETTINGS);
    const [scope, setScope] = useState<SettingsScope>("global");
    return (
      <Frame>
        <Sidebar
          effectiveSettings={settings}
          scope={scope}
          hasOverride={false}
          hasAnyDocs={false}
          activeDocumentName={undefined}
          onChangeSettings={setSettings}
          onChangeScope={setScope}
          onClearOverride={() => {}}
          folder={null}
          parsedPaths={new Set()}
          onLoadEntry={() => {}}
          settingsCollapsed={false}
          onToggleSettingsCollapsed={() => {}}
          folderCollapsed={false}
          onToggleFolderCollapsed={() => {}}
          {...baseHandlers}
        />
      </Frame>
    );
  },
};

export const FolderLoaded: Story = {
  render: () => {
    const [settings, setSettings] = useState<ChunkSettings>(DEFAULT_CHUNK_SETTINGS);
    const [scope, setScope] = useState<SettingsScope>("perDocument");
    const entries: FolderEntry[] = [
      { path: "/c/cootad.pdf", name: "cootad.pdf", relativePath: "cootad.pdf", size: 3_456_789, modifiedAt: Date.now(), extension: "pdf" },
      { path: "/c/codigo.docx", name: "codigo.docx", relativePath: "codigo.docx", size: 482_120, modifiedAt: Date.now(), extension: "docx" },
      { path: "/c/notas.md", name: "notas.md", relativePath: "notas.md", size: 14_200, modifiedAt: Date.now(), extension: "md" },
    ];
    return (
      <Frame>
        <Sidebar
          effectiveSettings={settings}
          scope={scope}
          hasOverride
          hasAnyDocs
          activeDocumentName="cootad-2026.pdf"
          onChangeSettings={setSettings}
          onChangeScope={setScope}
          onClearOverride={() => {}}
          folder={{
            selection: { path: "/c", name: "legal-corpus" },
            entries,
            loading: "idle",
            error: null,
          }}
          parsedPaths={new Set(["/c/cootad.pdf"])}
          onLoadEntry={() => {}}
          settingsCollapsed={false}
          onToggleSettingsCollapsed={() => {}}
          folderCollapsed={false}
          onToggleFolderCollapsed={() => {}}
          {...baseHandlers}
        />
      </Frame>
    );
  },
};

export const Collapsed: Story = {
  render: () => (
    <Frame>
      <Sidebar
        effectiveSettings={DEFAULT_CHUNK_SETTINGS}
        scope="global"
        hasOverride={false}
        hasAnyDocs
        activeDocumentName="cootad-2026.pdf"
        onChangeSettings={() => {}}
        onChangeScope={() => {}}
        onClearOverride={() => {}}
        folder={null}
        parsedPaths={new Set()}
        onLoadEntry={() => {}}
        settingsCollapsed
        onToggleSettingsCollapsed={() => {}}
        folderCollapsed
        onToggleFolderCollapsed={() => {}}
        {...baseHandlers}
      />
    </Frame>
  ),
};
