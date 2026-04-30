import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderEntryRow } from "./FolderEntryRow";
import type { FolderEntry } from "@shared/types";

const meta: Meta<typeof FolderEntryRow> = {
  title: "App/FolderEntryRow",
  component: FolderEntryRow,
};
export default meta;

type Story = StoryObj<typeof FolderEntryRow>;

const pdfEntry: FolderEntry = {
  path: "/corpus/cootad-2026.pdf",
  name: "cootad-2026.pdf",
  relativePath: "cootad-2026.pdf",
  size: 3_456_789,
  modifiedAt: Date.now() - 86_400_000 * 4,
  extension: "pdf",
};

const nestedEntry: FolderEntry = {
  path: "/corpus/codigos/codigo-civil.docx",
  name: "codigo-civil.docx",
  relativePath: "codigos/codigo-civil.docx",
  size: 482_120,
  modifiedAt: Date.now() - 86_400_000 * 30,
  extension: "docx",
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <ul className="w-[420px] rounded-md border border-border bg-card/40 p-1">{children}</ul>
);

export const Unparsed: Story = {
  render: () => (
    <Frame>
      <FolderEntryRow entry={pdfEntry} parsed={false} onLoad={() => {}} />
    </Frame>
  ),
};

export const Loaded: Story = {
  render: () => (
    <Frame>
      <FolderEntryRow entry={pdfEntry} parsed onLoad={() => {}} />
    </Frame>
  ),
};

export const NestedPath: Story = {
  render: () => (
    <Frame>
      <FolderEntryRow entry={nestedEntry} parsed={false} onLoad={() => {}} />
    </Frame>
  ),
};
