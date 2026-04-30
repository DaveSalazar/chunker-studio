import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmbeddingPinEditor } from "./EmbeddingPinEditor";
import type { EmbeddingPin } from "@shared/types";

const meta: Meta<typeof EmbeddingPinEditor> = {
  title: "App/EmbeddingPinEditor",
  component: EmbeddingPinEditor,
};
export default meta;

type Story = StoryObj<typeof EmbeddingPinEditor>;

// EmbeddingPinEditor calls chunkerClient for the Ollama listing/probe.
// Stub the bridge so the Ollama branch can be exercised without an
// Electron host or a running Ollama daemon.
function useChunkerStub() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const original = (window as unknown as { chunker?: unknown }).chunker;
    (window as unknown as { chunker: unknown }).chunker = {
      listOllamaModels: async () => ({
        ok: true,
        value: [
          { name: "nomic-embed-text", details: "embedding 137M", embeddingDimensions: 768 },
          { name: "mxbai-embed-large", details: "embedding 335M", embeddingDimensions: 1024 },
        ],
      }),
      probeOllamaModel: async (_url: string | null, model: string) => ({
        ok: true,
        value: { dimensions: model.includes("large") ? 1024 : 768 },
      }),
    };
    setReady(true);
    return () => {
      (window as unknown as { chunker?: unknown }).chunker = original;
    };
  }, []);
  return ready;
}

export const OpenAI: Story = {
  render: () => {
    const [value, setValue] = useState<EmbeddingPin>({
      providerId: "openai",
      model: "text-embedding-3-small",
      dimensions: 1536,
    });
    return (
      <div className="w-[420px]">
        <EmbeddingPinEditor value={value} onChange={setValue} ollamaUrl={null} />
      </div>
    );
  },
};

export const Ollama: Story = {
  render: () => {
    const ready = useChunkerStub();
    const [value, setValue] = useState<EmbeddingPin>({
      providerId: "ollama",
      model: "",
      dimensions: 0,
    });
    if (!ready) return <span />;
    return (
      <div className="w-[420px]">
        <EmbeddingPinEditor value={value} onChange={setValue} ollamaUrl="http://localhost:11434" />
      </div>
    );
  },
};
