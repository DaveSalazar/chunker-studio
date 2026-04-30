import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocumentTabs } from "./DocumentTabs";
import type { DocumentEntry } from "@/hooks/useChunkerSession";

const meta: Meta<typeof DocumentTabs> = {
  title: "App/DocumentTabs",
  component: DocumentTabs,
};
export default meta;

type Story = StoryObj<typeof DocumentTabs>;

function makeDoc(
  id: string,
  name: string,
  loading: DocumentEntry["loading"],
  opts: { chunks?: number; overrides?: boolean } = {},
): DocumentEntry {
  return {
    id,
    file: {
      path: `/Users/demo/${name}`,
      name,
      size: 1024,
      modifiedAt: Date.now(),
      extension: name.split(".").pop()!,
    },
    parsed: null,
    result: opts.chunks !== undefined
      ? {
          chunks: Array.from({ length: opts.chunks }).map((_, i) => ({
            index: i + 1,
            article: null,
            heading: null,
            text: "",
            charCount: 0,
            tokenCount: 0,
            startOffset: 0,
            endOffset: 0,
          })),
          totalTokens: 0,
          totalChars: 0,
          strategy: "article",
          normalizedText: "",
          estimatedCostUsd: 0,
        }
      : null,
    overrides: opts.overrides
      ? {
          maxChunkTokens: 800,
          minChunkChars: 80,
          headingLookback: 600,
          letterRatio: 40,
          dehyphenate: true,
          splitByArticle: true,
          duplicateMinChars: 60,
          dropDuplicates: false,
        }
      : null,
    loading,
    error: null,
    view: "raw",
    manualMode: false,
  };
}

export const Mixed: Story = {
  render: () => {
    const [active, setActive] = useState("a");
    const [docs, setDocs] = useState([
      makeDoc("a", "codigo-civil.pdf", "ready", { chunks: 847 }),
      makeDoc("b", "cogep.pdf", "ready", { chunks: 341, overrides: true }),
      makeDoc("c", "demanda-divorcio.docx", "chunking"),
      makeDoc("d", "registro-oficial-2026-01.txt", "parsing"),
      makeDoc("e", "broken.pdf", "error"),
    ]);
    return (
      <div className="w-[820px]">
        <DocumentTabs
          documents={docs}
          activeId={active}
          tempId={null}
          onSelect={setActive}
          onPromote={() => {}}
          onClose={(id) => setDocs((ds) => ds.filter((d) => d.id !== id))}
          onAdd={() =>
            setDocs((ds) => [
              ...ds,
              makeDoc(`new-${ds.length}`, `extra-${ds.length}.pdf`, "unparsed"),
            ])
          }
        />
      </div>
    );
  },
};

export const WithPreviewTab: Story = {
  render: () => {
    const [active, setActive] = useState("c");
    const [tempId, setTempId] = useState<string | null>("c");
    const [docs, setDocs] = useState([
      makeDoc("a", "codigo-civil.pdf", "ready", { chunks: 847 }),
      makeDoc("b", "cogep.pdf", "ready", { chunks: 341 }),
      makeDoc("c", "demanda-divorcio.docx", "unparsed"),
    ]);
    return (
      <div className="w-[820px]">
        <DocumentTabs
          documents={docs}
          activeId={active}
          tempId={tempId}
          onSelect={setActive}
          onPromote={(id) =>
            setTempId((t) => (t === id ? null : t))
          }
          onClose={(id) => {
            setDocs((ds) => ds.filter((d) => d.id !== id));
            setTempId((t) => (t === id ? null : t));
          }}
          onAdd={() => {}}
        />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => (
    <div className="w-[820px]">
      <DocumentTabs
        documents={[]}
        activeId={null}
        tempId={null}
        onSelect={() => {}}
        onPromote={() => {}}
        onClose={() => {}}
        onAdd={() => {}}
      />
    </div>
  ),
};
