import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocumentViewer } from "./DocumentViewer";
import type { ChunkRecord, OpenedFile, ParsedDocument } from "@shared/types";

const meta: Meta<typeof DocumentViewer> = {
  title: "App/DocumentViewer",
  component: DocumentViewer,
};
export default meta;

type Story = StoryObj<typeof DocumentViewer>;

const file: OpenedFile = {
  path: "/c/cootad-2026.pdf",
  name: "cootad-2026.pdf",
  size: 3_456_789,
  modifiedAt: Date.now() - 86_400_000 * 4,
  extension: "pdf",
};

const parsedText = [
  "Art. 1.- Ámbito.- La presente ley regula el ejercicio de la autoridad y las potestades públicas de los gobiernos autónomos descentralizados.",
  "",
  "Art. 2.- Objetivos.- Son objetivos del presente Código: a) La autonomía política, administrativa y financiera de los gobiernos autónomos descentralizados …",
  "",
  "Art. 3.- Principios.- El ejercicio de la autoridad y las potestades públicas se regirá por los siguientes principios: a) Unidad …",
].join("\n");

const parsed: ParsedDocument = {
  path: file.path,
  name: file.name,
  extension: file.extension,
  text: parsedText,
  pageCount: 398,
  warnings: [],
};

const chunks: ChunkRecord[] = [
  {
    index: 0,
    article: "1",
    heading: "TÍTULO I: PRINCIPIOS GENERALES",
    text: parsedText.split("\n\n")[0],
    charCount: 152,
    tokenCount: 38,
    startOffset: 0,
    endOffset: 151,
  },
  {
    index: 1,
    article: "2",
    heading: "TÍTULO I: PRINCIPIOS GENERALES",
    text: parsedText.split("\n\n")[1],
    charCount: 198,
    tokenCount: 47,
    startOffset: 152,
    endOffset: 350,
  },
  {
    index: 2,
    article: "3",
    heading: "TÍTULO I: PRINCIPIOS GENERALES",
    text: parsedText.split("\n\n")[2],
    charCount: 175,
    tokenCount: 41,
    startOffset: 351,
    endOffset: 525,
  },
];

// PDF iframe inside RawDocumentView depends on chunkerClient.readFile.
// Stub it so the "raw" view renders without an Electron host.
function useChunkerStub() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const original = (window as unknown as { chunker?: unknown }).chunker;
    (window as unknown as { chunker: unknown }).chunker = {
      readFile: async () => ({ ok: true, value: new Uint8Array() }),
    };
    setReady(true);
    return () => {
      (window as unknown as { chunker?: unknown }).chunker = original;
    };
  }, []);
  return ready;
}

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[640px] w-[820px]">{children}</div>
);

const baseHandlers = {
  onChunkClick: () => {},
  onParse: () => {},
  onChangeView: () => {},
  onChunkBoundaryChange: () => {},
  onResetToAuto: () => {},
};

export const ParsedReady: Story = {
  render: () => {
    const ready = useChunkerStub();
    if (!ready) return <span />;
    return (
      <Frame>
        <DocumentViewer
          file={file}
          parsed={parsed}
          chunks={chunks}
          normalizedText={parsedText}
          loading="ready"
          view="parsed"
          activeChunkIndex={1}
          manualMode={false}
          {...baseHandlers}
        />
      </Frame>
    );
  },
};

export const Unparsed: Story = {
  render: () => {
    const ready = useChunkerStub();
    if (!ready) return <span />;
    return (
      <Frame>
        <DocumentViewer
          file={file}
          parsed={null}
          chunks={[]}
          normalizedText={null}
          loading="unparsed"
          view="raw"
          activeChunkIndex={null}
          manualMode={false}
          {...baseHandlers}
        />
      </Frame>
    );
  },
};

export const Parsing: Story = {
  render: () => {
    const ready = useChunkerStub();
    if (!ready) return <span />;
    return (
      <Frame>
        <DocumentViewer
          file={file}
          parsed={null}
          chunks={[]}
          normalizedText={null}
          loading="parsing"
          view="raw"
          activeChunkIndex={null}
          manualMode={false}
          {...baseHandlers}
        />
      </Frame>
    );
  },
};

export const ManualEdits: Story = {
  render: () => {
    const ready = useChunkerStub();
    if (!ready) return <span />;
    return (
      <Frame>
        <DocumentViewer
          file={file}
          parsed={parsed}
          chunks={chunks}
          normalizedText={parsedText}
          loading="ready"
          view="parsed"
          activeChunkIndex={null}
          manualMode
          {...baseHandlers}
        />
      </Frame>
    );
  },
};

export const ScannedPdf: Story = {
  render: () => {
    const ready = useChunkerStub();
    if (!ready) return <span />;
    return (
      <Frame>
        <DocumentViewer
          file={file}
          parsed={{ ...parsed, text: "", unsupportedReason: "scanned-pdf" }}
          chunks={[]}
          normalizedText={null}
          loading="ready"
          view="raw"
          activeChunkIndex={null}
          manualMode={false}
          {...baseHandlers}
        />
      </Frame>
    );
  },
};
