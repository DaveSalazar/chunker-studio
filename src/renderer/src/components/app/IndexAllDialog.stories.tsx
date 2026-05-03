import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndexAllDialog } from "./IndexAllDialog";
import { Button } from "@/components/ui/Button";
import type { IndexableDocument } from "@/hooks/session/types";

const meta: Meta<typeof IndexAllDialog> = {
  title: "App/IndexAllDialog",
  component: IndexAllDialog,
};
export default meta;

type Story = StoryObj<typeof IndexAllDialog>;

// A handful of templates with realistic filenames so the title-heuristic
// preview is meaningful in the dialog. Inner chunk shape is minimal —
// real ingest never runs in Storybook (the IPC bridge is unavailable).
const SAMPLE_DOCS: IndexableDocument[] = [
  buildDoc("aclaratoria-y-rectificatoria-minuta-notarial.docx", 1),
  buildDoc("autorizacion-de-salida-de-menor-familia.docx", 2),
  buildDoc("contrato-arrendamiento-comercial.docx", 3),
  buildDoc("demanda-divorcio-mutuo-acuerdo.docx", 4),
];

function buildDoc(fileName: string, id: number): IndexableDocument {
  return {
    id: `doc-${id}`,
    fileName,
    chunks: [
      {
        index: 1,
        article: null,
        heading: null,
        text: fileName.replace(/\.docx?$/i, ""),
        body: "Cuerpo completo de la plantilla …",
        charCount: 1500,
        tokenCount: 380,
        startOffset: 0,
        endOffset: 1500,
      },
    ],
    totalTokens: 380,
  };
}

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <IndexAllDialog
          open={open}
          onOpenChange={setOpen}
          documents={SAMPLE_DOCS}
          onOpenSettings={() => {}}
        />
      </>
    );
  },
};

export const HeavyTemplate: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    // Inflate one body's tokenCount past the warning threshold (8k) so
    // the amber "this template body is large" strip renders idle.
    const docs: IndexableDocument[] = [
      ...SAMPLE_DOCS,
      {
        ...buildDoc("estatutos-sociedad-anonima.docx", 99),
        chunks: [
          {
            index: 1,
            article: null,
            heading: null,
            text: "Estatutos sociales — primer fragmento …",
            body: "Cuerpo completo grande …",
            charCount: 14_000,
            tokenCount: 9_200,
            startOffset: 0,
            endOffset: 14_000,
          },
        ],
        totalTokens: 9_200,
      },
    ];
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <IndexAllDialog
          open={open}
          onOpenChange={setOpen}
          documents={docs}
          onOpenSettings={() => {}}
        />
      </>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <IndexAllDialog
          open={open}
          onOpenChange={setOpen}
          documents={[]}
          onOpenSettings={() => {}}
        />
      </>
    );
  },
};
