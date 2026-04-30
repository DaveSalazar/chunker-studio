import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PdfPreview } from "./PdfPreview";

// PdfPreview reads file bytes via IPC. Storybook can't supply a real
// Electron host, so we stub the bridge: the success story hands back a
// minimal valid PDF (Chromium renders it inline); the error story
// throws to exercise the failure branch.

const meta: Meta<typeof PdfPreview> = {
  title: "App/PdfPreview",
  component: PdfPreview,
};
export default meta;

type Story = StoryObj<typeof PdfPreview>;

// Smallest valid PDF — single empty page. Source: pdfa.org minimal example.
const TINY_PDF = `%PDF-1.1
%\xc2\xa5\xc2\xb1\xc3\xab
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000010 00000 n
0000000053 00000 n
0000000102 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
178
%%EOF`;

function useChunkerMock(handler: (path: string) => Promise<Uint8Array>) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const original = (window as unknown as { chunker?: unknown }).chunker;
    (window as unknown as { chunker: unknown }).chunker = {
      readFile: async (path: string) => ({ ok: true, value: await handler(path) }),
    };
    setReady(true);
    return () => {
      (window as unknown as { chunker?: unknown }).chunker = original;
    };
  }, [handler]);
  return ready;
}

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[520px] w-[680px]">{children}</div>
);

export const Loaded: Story = {
  render: () => {
    const ready = useChunkerMock(async () => new TextEncoder().encode(TINY_PDF));
    return <Frame>{ready ? <PdfPreview filePath="/sample.pdf" /> : null}</Frame>;
  },
};

export const Errored: Story = {
  render: () => {
    const ready = useChunkerMock(async () => {
      throw new Error("ENOENT: no such file or directory, open '/missing.pdf'");
    });
    return <Frame>{ready ? <PdfPreview filePath="/missing.pdf" /> : null}</Frame>;
  },
};
