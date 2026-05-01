import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocumentWorkspace } from "./DocumentWorkspace";
import type { DocumentEntry } from "@/hooks/useChunkerSession";
import type { ChunkRecord, ChunkingResult, OpenedFile, ParsedDocument } from "@shared/types";

const meta: Meta<typeof DocumentWorkspace> = {
  title: "App/DocumentWorkspace",
  component: DocumentWorkspace,
};
export default meta;

type Story = StoryObj<typeof DocumentWorkspace>;

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

function makeFile(name: string, ext: string): OpenedFile {
  return {
    path: `/c/${name}`,
    name,
    size: 1_200_000,
    modifiedAt: Date.now() - 86_400_000,
    extension: ext,
  };
}

const parsedText = [
  "Art. 1.- Ámbito.- La presente ley regula …",
  "",
  "Art. 2.- Objetivos.- Son objetivos del presente Código …",
  "",
  "Art. 3.- Principios.- El ejercicio de la autoridad …",
].join("\n");

const parsed = (file: OpenedFile): ParsedDocument => ({
  path: file.path,
  name: file.name,
  extension: file.extension,
  text: parsedText,
  pageCount: 398,
  warnings: [],
});

const chunk = (i: number, article: string): ChunkRecord => ({
  index: i,
  article,
  heading: "TÍTULO I: PRINCIPIOS GENERALES",
  text: parsedText.split("\n\n")[i] ?? "",
  charCount: 160 + i * 4,
  tokenCount: 40 + i,
  startOffset: i * 200,
  endOffset: (i + 1) * 200 - 1,
});

const result = (): ChunkingResult => ({
  chunks: [chunk(0, "1"), chunk(1, "2"), chunk(2, "3")],
  totalTokens: 130,
  totalChars: 540,
  strategy: "article",
  normalizedText: parsedText,
  estimatedCostUsd: 0.0026,
});

const ready = (file: OpenedFile, id: string): DocumentEntry => ({
  id,
  file,
  parsed: parsed(file),
  result: result(),
  overrides: null,
  loading: "ready",
  error: null,
  view: "parsed",
  manualMode: false,
  pdfPage: 1,
});

const unparsed = (file: OpenedFile, id: string): DocumentEntry => ({
  id,
  file,
  parsed: null,
  result: null,
  overrides: null,
  loading: "unparsed",
  error: null,
  view: "raw",
  manualMode: false,
  pdfPage: 1,
});

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[720px] w-[1100px]">{children}</div>
);

const noopHandlers = {
  onChunkClick: () => {},
  onSelectTab: () => {},
  onCloseTab: () => {},
  onAddTab: () => {},
  onPromote: () => {},
  onParse: () => {},
  onChangeView: () => {},
  onChunkBoundaryChange: () => {},
  onResetToAuto: () => {},
  onPdfPageChange: () => {},
  onIngest: () => {},
};

export const TwoTabsActiveReady: Story = {
  render: () => {
    const stubReady = useChunkerStub();
    if (!stubReady) return <span />;
    const docs = [
      ready(makeFile("cootad-2026.pdf", "pdf"), "doc-1"),
      unparsed(makeFile("codigo-civil.docx", "docx"), "doc-2"),
    ];
    return (
      <Frame>
        <DocumentWorkspace
          documents={docs}
          activeId="doc-1"
          activeDoc={docs[0]}
          scope="global"
          overrideCount={0}
          effectiveResult={docs[0].result}
          totals={{ documents: 2, chunks: 3, tokens: 130, usd: 0.0026 }}
          tempId={null}
          activeChunkIndex={0}
          {...noopHandlers}
        />
      </Frame>
    );
  },
};

export const NoActiveDocument: Story = {
  render: () => {
    const stubReady = useChunkerStub();
    if (!stubReady) return <span />;
    return (
      <Frame>
        <DocumentWorkspace
          documents={[]}
          activeId={null}
          activeDoc={null}
          scope="global"
          overrideCount={0}
          effectiveResult={null}
          totals={{ documents: 0, chunks: 0, tokens: 0, usd: 0 }}
          tempId={null}
          activeChunkIndex={null}
          {...noopHandlers}
        />
      </Frame>
    );
  },
};

export const ErrorBanner: Story = {
  render: () => {
    const stubReady = useChunkerStub();
    if (!stubReady) return <span />;
    const file = makeFile("broken.pdf", "pdf");
    const doc: DocumentEntry = {
      ...unparsed(file, "doc-1"),
      loading: "error",
      error: "PDF parser: invalid xref table",
    };
    return (
      <Frame>
        <DocumentWorkspace
          documents={[doc]}
          activeId="doc-1"
          activeDoc={doc}
          scope="global"
          overrideCount={0}
          effectiveResult={null}
          totals={{ documents: 1, chunks: 0, tokens: 0, usd: 0 }}
          tempId={null}
          activeChunkIndex={null}
          {...noopHandlers}
        />
      </Frame>
    );
  },
};
