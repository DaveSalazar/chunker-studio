import type { AppConfig, SchemaProfile } from "../../../../shared/types";

export type { AppConfig } from "../../../../shared/types";

/**
 * Bundled defaults seeded on first read into a fresh config file.
 * Operators can edit them in the Schemas tab; they cannot be deleted
 * (`builtIn: true`).
 */
export const DEFAULT_PROFILES: SchemaProfile[] = [
  {
    // The id stays `legal-references` to preserve any persisted user
    // configs that reference it; only the user-facing name + description
    // were genericized so the tool reads as broader than just law.
    id: "legal-references",
    name: "Article-based references",
    description:
      "Codes, regulations, contracts, technical manuals — article-aware chunking against the corpus_chunks table.",
    table: "corpus_chunks",
    textColumn: "text",
    embeddingColumn: "embedding",
    articleColumn: "article",
    headingColumn: "heading",
    documentFields: [
      {
        key: "sourceName",
        column: "source_name",
        label: "Source name",
        hint: "Stored as source_name. Existing rows for this name are replaced.",
        kind: "text",
        required: true,
        isSourceKey: true,
      },
      {
        key: "sourceType",
        column: "source_type",
        label: "Source type",
        hint: "Reference types feed chat RAG.",
        kind: "select",
        required: true,
        defaultValue: "codigo",
        options: [
          { value: "codigo", label: "Code" },
          { value: "ley", label: "Law" },
          { value: "reglamento", label: "Regulation" },
          { value: "sentencia", label: "Jurisprudence" },
          { value: "constitucion", label: "Constitution" },
        ],
      },
    ],
    chunking: "articleAware",
    embedding: {
      providerId: "openai",
      model: "text-embedding-3-small",
      dimensions: 1536,
    },
    builtIn: true,
  },
  {
    id: "legal-templates",
    name: "Document templates",
    description:
      "Briefs, contracts, manuals — paragraph chunking against the template_chunks table. Edit the column names to match your schema.",
    table: "template_chunks",
    textColumn: "text",
    embeddingColumn: "embedding",
    articleColumn: null,
    headingColumn: "heading",
    documentFields: [
      {
        key: "templateName",
        column: "template_name",
        label: "Template name",
        hint: "Stored as template_name. Existing rows for this name are replaced.",
        kind: "text",
        required: true,
        isSourceKey: true,
      },
      {
        key: "templateType",
        column: "template_type",
        label: "Template type",
        kind: "select",
        required: true,
        defaultValue: "demanda",
        options: [
          { value: "demanda", label: "Lawsuit" },
          { value: "contrato", label: "Contract" },
          { value: "escrito", label: "Brief" },
          { value: "denuncia", label: "Complaint" },
          { value: "guia", label: "Guide" },
          { value: "manual", label: "Manual" },
          { value: "plantilla", label: "Template" },
        ],
      },
    ],
    chunking: "paragraph",
    embedding: {
      providerId: "openai",
      model: "text-embedding-3-small",
      dimensions: 1536,
    },
    builtIn: true,
  },
];

export const EMPTY_CONFIG: AppConfig = {
  openaiApiKey: null,
  databaseUrl: null,
  ollamaUrl: null,
  profiles: DEFAULT_PROFILES,
  defaultProfileId: DEFAULT_PROFILES[0].id,
};

export class MissingConfigError extends Error {
  constructor(public readonly field: keyof AppConfig | string) {
    super(`Configuration is missing: ${String(field)}`);
    this.name = "MissingConfigError";
  }
}
