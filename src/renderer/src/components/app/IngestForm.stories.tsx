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

const skeletonsProfile: SchemaProfile = {
  id: "legal-skeletons",
  name: "Document skeletons",
  description: "One row per file. Sections, citations, fields — body is audit-only.",
  table: "skeletons",
  textColumn: "text",
  embeddingColumn: "embedding",
  articleColumn: null,
  headingColumn: null,
  bodyColumn: "source_body",
  fieldsColumn: "fields",
  sectionsColumn: "sections",
  citationsColumn: "citations",
  documentFields: [
    {
      key: "name",
      column: "name",
      label: "Slug",
      kind: "text",
      required: true,
      isSourceKey: true,
    },
    {
      key: "title",
      column: "title",
      label: "Title (display)",
      kind: "text",
      required: true,
      isTitleKey: true,
    },
    {
      key: "docType",
      column: "doc_type",
      label: "Document type",
      kind: "select",
      required: true,
      options: [
        { value: "minuta", label: "Minuta notarial" },
        { value: "demanda", label: "Demanda" },
        { value: "contrato", label: "Contrato" },
      ],
    },
  ],
  chunking: "wholeDocument",
  embedding: { providerId: "ollama", model: "nomic-embed-text", dimensions: 768 },
  builtIn: true,
};

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-[520px] flex-col gap-4">{children}</div>
);

export const OpenAIProfile: Story = {
  render: () => {
    const [profile, setProfile] = useState<SchemaProfile | null>(referencesProfile);
    const [values, setValues] = useState<Record<string, string>>({});
    const profiles = [referencesProfile, skeletonsProfile];
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
        profile={skeletonsProfile}
        profiles={[referencesProfile, skeletonsProfile]}
        onSelectProfile={() => {}}
        values={{ name: "minuta-compraventa", title: "Minuta compraventa", docType: "minuta" }}
        onChangeValue={() => {}}
        chunkCount={1}
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
