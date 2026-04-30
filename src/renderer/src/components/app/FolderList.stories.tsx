import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderList } from "./FolderList";
import type { FolderEntry } from "@shared/types";

const meta: Meta<typeof FolderList> = {
  title: "App/FolderList",
  component: FolderList,
};
export default meta;

type Story = StoryObj<typeof FolderList>;

const entries: FolderEntry[] = [
  { path: "/c/cootad-2026.pdf", name: "cootad-2026.pdf", relativePath: "cootad-2026.pdf", size: 3_456_789, modifiedAt: Date.now() - 1, extension: "pdf" },
  { path: "/c/codigo-civil.docx", name: "codigo-civil.docx", relativePath: "codigos/codigo-civil.docx", size: 482_120, modifiedAt: Date.now() - 2, extension: "docx" },
  { path: "/c/notas.md", name: "notas.md", relativePath: "notas.md", size: 14_200, modifiedAt: Date.now() - 3, extension: "md" },
  { path: "/c/ejemplo.txt", name: "ejemplo.txt", relativePath: "samples/ejemplo.txt", size: 7_400, modifiedAt: Date.now() - 4, extension: "txt" },
];

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-[420px] rounded-md border border-border bg-card/40 p-3">{children}</div>
);

export const Mixed: Story = {
  render: () => (
    <Frame>
      <FolderList
        entries={entries}
        filtered={entries}
        parsedPaths={new Set([entries[0].path])}
        loading="idle"
        query=""
        onLoadEntry={() => {}}
      />
    </Frame>
  ),
};

export const Empty: Story = {
  render: () => (
    <Frame>
      <FolderList
        entries={[]}
        filtered={[]}
        parsedPaths={new Set()}
        loading="idle"
        query=""
        onLoadEntry={() => {}}
      />
    </Frame>
  ),
};

export const NoMatchesForQuery: Story = {
  render: () => (
    <Frame>
      <FolderList
        entries={entries}
        filtered={[]}
        parsedPaths={new Set()}
        loading="idle"
        query="zzz"
        onLoadEntry={() => {}}
      />
    </Frame>
  ),
};
