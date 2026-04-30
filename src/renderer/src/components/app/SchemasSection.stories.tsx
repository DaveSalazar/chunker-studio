import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SchemasSection } from "./SchemasSection";
import type { AppConfig, SchemaProfile } from "@shared/types";

const meta: Meta<typeof SchemasSection> = {
  title: "App/SchemasSection",
  component: SchemasSection,
};
export default meta;

type Story = StoryObj<typeof SchemasSection>;

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
  id: "custom",
  name: "Custom corpus",
  description: "User-defined.",
  table: "custom_corpus",
  builtIn: false,
};

const seed: AppConfig = {
  openaiApiKey: null,
  databaseUrl: null,
  ollamaUrl: "http://localhost:11434",
  profiles: [builtIn, custom],
  defaultProfileId: "legal-references",
};

function useChunkerStub() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let stored: AppConfig = seed;
    const original = (window as unknown as { chunker?: unknown }).chunker;
    (window as unknown as { chunker: unknown }).chunker = {
      readConfig: async () => ({ ok: true, value: stored }),
      writeConfig: async (next: AppConfig) => {
        stored = next;
        return { ok: true, value: next };
      },
      listOllamaModels: async () => ({
        ok: true,
        value: [{ name: "nomic-embed-text", details: "embedding 137M", embeddingDimensions: 768 }],
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

export const WithProfiles: Story = {
  render: () => {
    const ready = useChunkerStub();
    if (!ready) return <span />;
    return (
      <div className="w-[680px]">
        <SchemasSection active />
      </div>
    );
  },
};
