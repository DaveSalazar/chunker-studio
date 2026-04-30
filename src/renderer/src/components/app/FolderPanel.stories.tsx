import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderPanel } from "./FolderPanel";
import type { FolderEntry, FolderSelection } from "@shared/types";

const meta: Meta<typeof FolderPanel> = {
  title: "App/FolderPanel",
  component: FolderPanel,
};
export default meta;

type Story = StoryObj<typeof FolderPanel>;

const SELECTION: FolderSelection = {
  path: "/Users/demo/legal-corpus",
  name: "legal-corpus",
};

const ENTRIES: FolderEntry[] = [
  ["codigos/codigo-civil.pdf", 4_812_000],
  ["codigos/cogep.pdf", 2_410_000],
  ["codigos/coip.pdf", 5_120_000],
  ["leyes/ley-organica-familia.pdf", 740_000],
  ["leyes/ley-companias.pdf", 980_000],
  ["constitucion/constitucion-2008.pdf", 612_000],
  ["sentencias/cce-029-2024.pdf", 230_000],
  ["plantillas/demanda-divorcio.docx", 81_400],
  ["plantillas/contrato-arrendamiento.docx", 64_500],
  ["misc/registro-oficial-2026-01.txt", 412_000],
].map(([rel, size]) => ({
  path: `/Users/demo/legal-corpus/${rel}`,
  name: String(rel).split("/").pop()!,
  relativePath: String(rel),
  size: Number(size),
  modifiedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  extension: String(rel).split(".").pop()!,
}));

export const NoSelection: Story = {
  render: () => (
    <div className="h-[560px] w-[340px]">
      <FolderPanel
        selection={null}
        entries={[]}
        loading="idle"
        error={null}
        parsedPaths={new Set()}
        onSelectFolder={() => {}}
        onCloseFolder={() => {}}
        onRefresh={() => {}}
        onLoadEntry={() => {}}
        onParseAll={() => {}}
      />
    </div>
  ),
};

export const Listed: Story = {
  render: () => {
    const [loaded, setLoaded] = useState<Set<string>>(new Set([ENTRIES[0].path]));
    return (
      <div className="h-[560px] w-[340px]">
        <FolderPanel
          selection={SELECTION}
          entries={ENTRIES}
          loading="idle"
          error={null}
          parsedPaths={loaded}
          onSelectFolder={() => {}}
          onCloseFolder={() => {}}
          onRefresh={() => {}}
          onLoadEntry={(entry) =>
            setLoaded((s) => new Set([...s, entry.path]))
          }
          onParseAll={() =>
            setLoaded(new Set(ENTRIES.map((e) => e.path)))
          }
        />
      </div>
    );
  },
};

export const Listing: Story = {
  render: () => (
    <div className="h-[560px] w-[340px]">
      <FolderPanel
        selection={SELECTION}
        entries={[]}
        loading="listing"
        error={null}
        parsedPaths={new Set()}
        onSelectFolder={() => {}}
        onCloseFolder={() => {}}
        onRefresh={() => {}}
        onLoadEntry={() => {}}
        onParseAll={() => {}}
      />
    </div>
  ),
};

export const Collapsed: Story = {
  render: () => {
    const [collapsed, setCollapsed] = useState(true);
    return (
      <div className="h-[560px] w-[340px]">
        <FolderPanel
          selection={SELECTION}
          entries={ENTRIES}
          loading="idle"
          error={null}
          parsedPaths={new Set()}
          onSelectFolder={() => {}}
          onCloseFolder={() => {}}
          onRefresh={() => {}}
          onLoadEntry={() => {}}
          onParseAll={() => {}}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
        />
      </div>
    );
  },
};
