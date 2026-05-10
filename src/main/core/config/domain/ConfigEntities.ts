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
    // Skeleton-driven profile for legal docs (acusación, demanda,
    // contrato, minuta, etc). Writes only the structural fingerprint
    // (sections + fields + citations) plus an intent-surface text
    // column to the `skeletons` table. The verbatim body is stored in
    // `source_body` for human audit only and is NEVER given to the LLM
    // — at draft time the LLM redrafts each section in fresh prose,
    // grounded in real code articles pulled from corpus_chunks.
    //
    // Replaces the deprecated "legal-templates" profile (which wrote
    // verbatim bodies to `template_chunks`, an IP-risky shape).
    id: "legal-skeletons",
    name: "Document skeletons",
    description:
      "Skeletons of demandas, contratos, minutas, escritos — one row per file. Sections, citations and field markers are extracted and embedded as the intent surface; the verbatim body is kept in source_body for audit only and never given to the LLM.",
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
        hint: "Stored as `name`. Existing rows with this slug are replaced on re-ingest.",
        kind: "text",
        required: true,
        isSourceKey: true,
      },
      {
        key: "title",
        column: "title",
        label: "Title (display)",
        hint: "Human-readable label shown in retrieval results. Pre-filled from the filename — edit if needed.",
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
        defaultValue: "minuta",
        options: [
          { value: "minuta", label: "Minuta notarial" },
          { value: "demanda", label: "Demanda" },
          { value: "contrato", label: "Contrato" },
          { value: "escrito", label: "Escrito" },
          { value: "denuncia", label: "Denuncia / querella / acusación" },
          { value: "guia", label: "Guía" },
          { value: "manual", label: "Manual / protocolo" },
          { value: "esquema", label: "Esquema genérico" },
        ],
      },
    ],
    chunking: "wholeDocument",
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
