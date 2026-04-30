import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { IngestForm } from "./IngestForm";
import type { SchemaProfile } from "@shared/types";

const meta: Meta<typeof IngestForm> = {
  title: "App/IngestForm",
  component: IngestForm,
};
export default meta;

type Story = StoryObj<typeof IngestForm>;

const referencesProfile: SchemaProfile = {
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
    {
      key: "sourceType",
      column: "source_type",
      label: "Source type",
      kind: "select",
      required: true,
      options: [
        { value: "codigo", label: "Código" },
        { value: "ley", label: "Ley" },
        { value: "reglamento", label: "Reglamento" },
      ],
    },
  ],
  chunking: "articleAware",
  embedding: { providerId: "openai", model: "text-embedding-3-small", dimensions: 1536 },
  builtIn: true,
};

const templatesProfile: SchemaProfile = {
  ...referencesProfile,
  id: "legal-templates",
  name: "Legal templates",
  description: "Reusable demand / contract / brief templates.",
  table: "legal_templates",
  embedding: { providerId: "ollama", model: "nomic-embed-text", dimensions: 768 },
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-[520px] flex-col gap-4">{children}</div>
);

export const OpenAIProfile: Story = {
  render: () => {
    const [profile, setProfile] = useState<SchemaProfile | null>(referencesProfile);
    const [values, setValues] = useState<Record<string, string>>({});
    const profiles = [referencesProfile, templatesProfile];
    return (
      <Frame>
        <IngestForm
          profile={profile}
          profiles={profiles}
          onSelectProfile={(id) => setProfile(profiles.find((p) => p.id === id) ?? null)}
          values={values}
          onChangeValue={(k, v) => setValues({ ...values, [k]: v })}
          chunkCount={192}
          estimatedCostUsd={0.0316}
        />
      </Frame>
    );
  },
};

export const LocalEmbeddings: Story = {
  render: () => (
    <Frame>
      <IngestForm
        profile={templatesProfile}
        profiles={[referencesProfile, templatesProfile]}
        onSelectProfile={() => {}}
        values={{ source: "manual.docx", sourceType: "manual" }}
        onChangeValue={() => {}}
        chunkCount={42}
        estimatedCostUsd={0}
      />
    </Frame>
  ),
};

export const NoProfiles: Story = {
  render: () => (
    <Frame>
      <IngestForm
        profile={null}
        profiles={[]}
        onSelectProfile={() => {}}
        values={{}}
        onChangeValue={() => {}}
        chunkCount={0}
        estimatedCostUsd={0}
      />
    </Frame>
  ),
};
