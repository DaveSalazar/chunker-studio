import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfileEditor } from "./ProfileEditor";
import type { SchemaProfile } from "@shared/types";

const meta: Meta<typeof ProfileEditor> = {
  title: "App/ProfileEditor",
  component: ProfileEditor,
};
export default meta;

type Story = StoryObj<typeof ProfileEditor>;

// EmbeddingPinEditor inside ProfileEditor calls chunkerClient for the
// Ollama list/probe — stub the bridge so the form mounts cleanly.
function useChunkerStub() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const original = (window as unknown as { chunker?: unknown }).chunker;
    (window as unknown as { chunker: unknown }).chunker = {
      listOllamaModels: async () => ({
        ok: true,
        value: [
          { name: "nomic-embed-text", details: "embedding 137M", embeddingDimensions: 768 },
        ],
      }),
      probeOllamaModel: async () => ({ ok: true, value: { dimensions: 768 } }),
    };
    setReady(true);
    return () => {
      (window as unknown as { chunker?: unknown }).chunker = original;
    };
  }, []);
  return ready;
}

const builtIn: SchemaProfile = {
  id: "legal-references",
  name: "Legal references",
  description: "Articles from codes, laws, and regulations.",
  table: "legal_references",
  textColumn: "text",
  embeddingColumn: "embedding",
  articleColumn: "article",
  headingColumn: "heading",
  documentFields: [
    {
      key: "source",
      column: "source",
      label: "Source",
      kind: "text",
      required: true,
      isSourceKey: true,
    },
  ],
  chunking: "articleAware",
  embedding: { providerId: "openai", model: "text-embedding-3-small", dimensions: 1536 },
  builtIn: true,
};

const custom: SchemaProfile = {
  ...builtIn,
  id: "custom-profile",
  name: "Custom corpus",
  description: "Custom user-defined profile.",
  table: "custom_corpus",
  builtIn: false,
};

export const BuiltIn: Story = {
  render: () => {
    const ready = useChunkerStub();
    if (!ready) return <span />;
    return (
      <div className="w-[640px]">
        <ProfileEditor
          profile={builtIn}
          ollamaUrl={null}
          onSave={async () => {}}
          onDelete={async () => {}}
        />
      </div>
    );
  },
};

export const CustomDeletable: Story = {
  render: () => {
    const ready = useChunkerStub();
    if (!ready) return <span />;
    return (
      <div className="w-[640px]">
        <ProfileEditor
          profile={custom}
          ollamaUrl="http://localhost:11434"
          onSave={async () => {}}
          onDelete={async () => {}}
        />
      </div>
    );
  },
};
