import type { Meta, StoryObj } from "@storybook/react-vite";
import { RawDocumentView } from "./RawDocumentView";
import type { OpenedFile } from "@shared/types";

const meta: Meta<typeof RawDocumentView> = {
  title: "App/RawDocumentView",
  component: RawDocumentView,
};
export default meta;

type Story = StoryObj<typeof RawDocumentView>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[420px] w-[640px]">{children}</div>
);

const docx: OpenedFile = {
  path: "/c/codigo-civil.docx",
  name: "codigo-civil.docx",
  size: 482_120,
  modifiedAt: Date.now() - 86_400_000,
  extension: "docx",
};

const xlsx: OpenedFile = {
  path: "/c/notes.xlsx",
  name: "notes.xlsx",
  size: 24_000,
  modifiedAt: Date.now() - 86_400_000,
  extension: "xlsx",
};

// PDF / TXT / MD branches need an IPC stub — see PdfPreview / TextPreview
// stories. RawDocumentView's own value is the dispatch logic, so the
// no-preview branches are what's worth showing here.
export const DocxNoPreview: Story = {
  render: () => (
    <Frame>
      <RawDocumentView file={docx} />
    </Frame>
  ),
};

export const UnsupportedNoPreview: Story = {
  render: () => (
    <Frame>
      <RawDocumentView file={xlsx} />
    </Frame>
  ),
};
