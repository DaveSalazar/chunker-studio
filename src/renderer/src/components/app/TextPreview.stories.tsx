import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextPreview } from "./TextPreview";

const meta: Meta<typeof TextPreview> = {
  title: "App/TextPreview",
  component: TextPreview,
};
export default meta;

type Story = StoryObj<typeof TextPreview>;

const SAMPLE = [
  "# Notes",
  "",
  "This file is rendered through the IPC bridge in the app. Storybook",
  "stubs window.chunker.readFile so the component shows the loaded",
  "state without an Electron host.",
  "",
  "- bullet one",
  "- bullet two",
  "- bullet three",
].join("\n");

const ERROR_MESSAGE = "EACCES: permission denied, open '/var/secret.txt'";

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
  <div className="h-[420px] w-[640px]">{children}</div>
);

export const Loaded: Story = {
  render: () => {
    const ready = useChunkerMock(async () => new TextEncoder().encode(SAMPLE));
    return <Frame>{ready ? <TextPreview filePath="/notes.md" /> : null}</Frame>;
  },
};

export const Errored: Story = {
  render: () => {
    const ready = useChunkerMock(async () => {
      throw new Error(ERROR_MESSAGE);
    });
    return <Frame>{ready ? <TextPreview filePath="/secret.txt" /> : null}</Frame>;
  },
};
