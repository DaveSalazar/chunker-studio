import { describe, expect, it } from "vitest";
import {
  defaultDocType,
  defaultSourceName,
  initialValuesForProfile,
  isFormReady,
} from "./profileFieldDefaults";
import type { DocumentFieldOption, SchemaProfile } from "@shared/types";

const SKELETON_DOC_TYPES: DocumentFieldOption[] = [
  { value: "minuta", label: "Minuta notarial" },
  { value: "demanda", label: "Demanda" },
  { value: "contrato", label: "Contrato" },
  { value: "escrito", label: "Escrito" },
];

const baseProfile = (
  overrides: Partial<SchemaProfile> = {},
): SchemaProfile => ({
  id: "p",
  name: "P",
  description: "",
  table: "t",
  textColumn: "text",
  embeddingColumn: "embedding",
  articleColumn: null,
  headingColumn: null,
  documentFields: [],
  chunking: "articleAware",
  embedding: { providerId: "openai", model: "x", dimensions: 1536 },
  ...overrides,
});

describe("defaultSourceName", () => {
  it("strips a single extension", () => {
    expect(defaultSourceName("foo.docx")).toBe("foo");
  });

  it("strips only the last extension when multiple dots are present", () => {
    expect(defaultSourceName("Codigo-Civil-09.02.2026.pdf")).toBe(
      "Codigo-Civil-09.02.2026",
    );
  });

  it("returns the input when there's no extension", () => {
    expect(defaultSourceName("plain")).toBe("plain");
  });

  it("returns empty for null", () => {
    expect(defaultSourceName(null)).toBe("");
  });

  it("does not strip a leading dot (hidden files keep their name)", () => {
    expect(defaultSourceName(".env")).toBe(".env");
  });
});

describe("defaultDocType", () => {
  it("matches a separator-free slug as a substring", () => {
    expect(
      defaultDocType("AUTORIZACIÓNMUTUAMINUTA.docx", SKELETON_DOC_TYPES),
    ).toBe("minuta");
  });

  it("matches even when the slug drops accents", () => {
    expect(
      defaultDocType("AUTORIZACIONMUTUAMINUTA.docx", SKELETON_DOC_TYPES),
    ).toBe("minuta");
  });

  it("matches inside hyphenated names", () => {
    expect(
      defaultDocType("aclaratoria-y-rectificatoria-minuta-notarial.docx", SKELETON_DOC_TYPES),
    ).toBe("minuta");
  });

  it("returns the longest matching option when multiple overlap", () => {
    const options: DocumentFieldOption[] = [
      { value: "demanda", label: "Demanda" },
      { value: "subdemanda", label: "Subdemanda" },
    ];
    expect(defaultDocType("subdemanda-laboral.docx", options)).toBe(
      "subdemanda",
    );
  });

  it("returns empty string when no option matches", () => {
    expect(defaultDocType("acuerdo-confidencialidad.docx", SKELETON_DOC_TYPES)).toBe("");
  });
});

describe("initialValuesForProfile", () => {
  it("seeds isSourceKey from the filename without its extension", () => {
    const p = baseProfile({
      documentFields: [
        {
          key: "name",
          column: "name",
          label: "Name",
          kind: "text",
          required: true,
          isSourceKey: true,
        },
      ],
    });
    expect(initialValuesForProfile(p, "minuta.docx")).toEqual({ name: "minuta" });
  });

  it("seeds isTitleKey from the filename via the title heuristic", () => {
    const p = baseProfile({
      documentFields: [
        {
          key: "title",
          column: "title",
          label: "Title",
          kind: "text",
          required: true,
          isTitleKey: true,
        },
      ],
    });
    expect(
      initialValuesForProfile(p, "aclaratoria-y-rectificatoria-minuta-notarial.docx"),
    ).toEqual({
      title: "Minuta aclaratoria y rectificatoria (notarial)",
    });
  });

  it("infers docType from the filename when the field is a select with options", () => {
    const p = baseProfile({
      documentFields: [
        {
          key: "docType",
          column: "doc_type",
          label: "Type",
          kind: "select",
          required: true,
          defaultValue: "minuta",
          options: SKELETON_DOC_TYPES,
        },
      ],
    });
    expect(
      initialValuesForProfile(p, "AUTORIZACIÓNMUTUAMINUTA.docx"),
    ).toEqual({ docType: "minuta" });
  });

  it("falls back to docType defaultValue when no option matches the filename", () => {
    const p = baseProfile({
      documentFields: [
        {
          key: "docType",
          column: "doc_type",
          label: "Type",
          kind: "select",
          required: true,
          defaultValue: "minuta",
          options: SKELETON_DOC_TYPES,
        },
      ],
    });
    expect(
      initialValuesForProfile(p, "acuerdo-confidencialidad.docx"),
    ).toEqual({ docType: "minuta" });
  });

  it("uses defaultValue for everything else", () => {
    const p = baseProfile({
      documentFields: [
        {
          key: "type",
          column: "type",
          label: "Type",
          kind: "select",
          defaultValue: "minuta",
        },
      ],
    });
    expect(initialValuesForProfile(p, "x.docx")).toEqual({ type: "minuta" });
  });

  it("blanks an unspecified field (operator must fill or required validation fails)", () => {
    const p = baseProfile({
      documentFields: [
        { key: "free", column: "free", label: "Free", kind: "text" },
      ],
    });
    expect(initialValuesForProfile(p, "x.docx")).toEqual({ free: "" });
  });

  it("returns blank values when documentName is null (no file in scope yet)", () => {
    const p = baseProfile({
      documentFields: [
        {
          key: "name",
          column: "name",
          label: "Name",
          kind: "text",
          required: true,
          isSourceKey: true,
        },
        {
          key: "title",
          column: "title",
          label: "Title",
          kind: "text",
          required: true,
          isTitleKey: true,
        },
      ],
    });
    expect(initialValuesForProfile(p, null)).toEqual({ name: "", title: "" });
  });
});

describe("isFormReady", () => {
  it("returns false when profile is null", () => {
    expect(isFormReady(null, {})).toBe(false);
  });

  it("returns true when no required fields exist", () => {
    const p = baseProfile({
      documentFields: [
        { key: "opt", column: "opt", label: "Opt", kind: "text" },
      ],
    });
    expect(isFormReady(p, {})).toBe(true);
  });

  it("returns false when a required field is missing", () => {
    const p = baseProfile({
      documentFields: [
        { key: "name", column: "name", label: "Name", kind: "text", required: true },
      ],
    });
    expect(isFormReady(p, {})).toBe(false);
  });

  it("returns false when a required field is whitespace-only", () => {
    const p = baseProfile({
      documentFields: [
        { key: "name", column: "name", label: "Name", kind: "text", required: true },
      ],
    });
    expect(isFormReady(p, { name: "   " })).toBe(false);
  });

  it("returns true when every required field has a non-blank value", () => {
    const p = baseProfile({
      documentFields: [
        { key: "name", column: "name", label: "Name", kind: "text", required: true },
        { key: "type", column: "type", label: "Type", kind: "select" },
      ],
    });
    expect(isFormReady(p, { name: "x" })).toBe(true);
  });
});
