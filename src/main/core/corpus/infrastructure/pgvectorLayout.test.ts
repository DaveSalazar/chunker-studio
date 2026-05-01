import { describe, expect, it } from "vitest";
import { planLayout, quoteIdent, sslConfigFor } from "./pgvectorLayout";
import type { ChunkPayload } from "../domain/CorpusEntities";
import type { DocumentField, SchemaProfile } from "../../../../shared/types";

const docField = (overrides: Partial<DocumentField> = {}): DocumentField => ({
  key: "source",
  column: "source",
  label: "Source",
  kind: "text",
  ...overrides,
});

const profile = (overrides: Partial<SchemaProfile> = {}): SchemaProfile => ({
  id: "p1",
  name: "Test profile",
  description: "",
  table: "rows",
  textColumn: "content",
  embeddingColumn: "embedding",
  articleColumn: null,
  headingColumn: null,
  documentFields: [],
  chunking: "articleAware",
  embedding: { providerId: "openai", model: "x", dimensions: 1536 },
  ...overrides,
});

const chunk = (overrides: Partial<ChunkPayload> = {}): ChunkPayload => ({
  article: null,
  heading: null,
  text: "body",
  embedding: [0.1, 0.2, 0.3],
  ...overrides,
});

describe("planLayout — required document fields", () => {
  it("throws when a required field is missing", () => {
    const p = profile({
      documentFields: [docField({ key: "source", required: true })],
    });
    expect(() => planLayout(p, {})).toThrow(/Missing required value for "Source"/);
  });

  it("throws when a required field is the empty string", () => {
    const p = profile({
      documentFields: [docField({ key: "source", required: true })],
    });
    expect(() => planLayout(p, { source: "" })).toThrow(/Missing required value/);
  });

  it("error message includes the human label and the key", () => {
    const p = profile({
      documentFields: [
        docField({ key: "src", column: "src", label: "Origin", required: true }),
      ],
    });
    expect(() => planLayout(p, {})).toThrow(/"Origin".*\(src\)/);
  });
});

describe("planLayout — optional document fields", () => {
  it("omits an optional field that is undefined", () => {
    const p = profile({ documentFields: [docField({ key: "src", column: "src" })] });
    const layout = planLayout(p, {});
    expect(layout.columns.map((c) => c.name)).not.toContain("src");
  });

  it("omits an optional field with empty-string value", () => {
    const p = profile({ documentFields: [docField({ key: "src", column: "src" })] });
    const layout = planLayout(p, { src: "" });
    expect(layout.columns.map((c) => c.name)).not.toContain("src");
  });

  it("includes an optional field that has a value", () => {
    const p = profile({ documentFields: [docField({ key: "src", column: "src" })] });
    const layout = planLayout(p, { src: "ley-123" });
    const col = layout.columns.find((c) => c.name === "src");
    expect(col?.valueFor(chunk())).toBe("ley-123");
  });
});

describe("planLayout — sourceKey", () => {
  it("captures the column + value when a field is flagged isSourceKey", () => {
    const p = profile({
      documentFields: [
        docField({ key: "src", column: "src_col", isSourceKey: true }),
      ],
    });
    const layout = planLayout(p, { src: "abc" });
    expect(layout.sourceKey).toEqual({ column: "src_col", value: "abc" });
  });

  it("leaves sourceKey null when no field is flagged", () => {
    const p = profile({ documentFields: [docField({ key: "src", column: "src" })] });
    const layout = planLayout(p, { src: "abc" });
    expect(layout.sourceKey).toBeNull();
  });

  it("does NOT set sourceKey when the flagged field is omitted (optional)", () => {
    const p = profile({
      documentFields: [docField({ key: "src", column: "src", isSourceKey: true })],
    });
    const layout = planLayout(p, {});
    expect(layout.sourceKey).toBeNull();
  });
});

describe("planLayout — per-chunk columns", () => {
  it("includes textColumn + embeddingColumn always (in that order at the tail)", () => {
    const layout = planLayout(profile(), {});
    const tail = layout.columns.slice(-2).map((c) => c.name);
    expect(tail).toEqual(["content", "embedding"]);
  });

  it("includes articleColumn only when the profile maps it", () => {
    const without = planLayout(profile(), {});
    expect(without.columns.map((c) => c.name)).not.toContain("article");
    const withCol = planLayout(profile({ articleColumn: "article" }), {});
    expect(withCol.columns.map((c) => c.name)).toContain("article");
  });

  it("includes headingColumn only when the profile maps it", () => {
    const without = planLayout(profile(), {});
    expect(without.columns.map((c) => c.name)).not.toContain("heading");
    const withCol = planLayout(profile({ headingColumn: "heading" }), {});
    expect(withCol.columns.map((c) => c.name)).toContain("heading");
  });

  it("text column resolver returns chunk.text", () => {
    const layout = planLayout(profile(), {});
    const textCol = layout.columns.find((c) => c.name === "content");
    expect(textCol?.valueFor(chunk({ text: "alpha" }))).toBe("alpha");
  });

  it("embedding column resolver wraps the array via pgvector.toSql ('[…]' literal)", () => {
    const layout = planLayout(profile(), {});
    const embCol = layout.columns.find((c) => c.name === "embedding");
    const sql = embCol?.valueFor(chunk({ embedding: [1, 2, 3] }));
    // pgvector.toSql produces a "[1,2,3]"-shaped string literal.
    expect(sql).toBe("[1,2,3]");
  });

  it("article/heading resolvers pass null through (column is nullable in DB)", () => {
    const layout = planLayout(
      profile({ articleColumn: "art", headingColumn: "hd" }),
      {},
    );
    const art = layout.columns.find((c) => c.name === "art");
    const hd = layout.columns.find((c) => c.name === "hd");
    expect(art?.valueFor(chunk({ article: null }))).toBeNull();
    expect(hd?.valueFor(chunk({ heading: null }))).toBeNull();
  });
});

describe("quoteIdent", () => {
  it("wraps a plain identifier in double quotes", () => {
    expect(quoteIdent("foo")).toBe('"foo"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(quoteIdent('weird"name')).toBe('"weird""name"');
  });

  it("does not interpret a dot as a schema separator (defense in depth)", () => {
    // The editor restricts to single identifiers, but we still don't
    // want public.foo to become "public"."foo" automatically here.
    expect(quoteIdent("public.foo")).toBe('"public.foo"');
  });
});

describe("sslConfigFor", () => {
  it("returns false when sslmode is missing", () => {
    expect(sslConfigFor("postgres://u:p@h/db")).toBe(false);
  });

  it("returns false when the URL is malformed", () => {
    expect(sslConfigFor("not a url")).toBe(false);
  });

  it("returns rejectUnauthorized:false for sslmode=require", () => {
    expect(sslConfigFor("postgres://u:p@h/db?sslmode=require")).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("returns rejectUnauthorized:false for sslmode=verify-ca", () => {
    expect(sslConfigFor("postgres://u:p@h/db?sslmode=verify-ca")).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("returns rejectUnauthorized:true for sslmode=verify-full", () => {
    expect(sslConfigFor("postgres://u:p@h/db?sslmode=verify-full")).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("treats ssl=true / ssl=1 as verify-full", () => {
    expect(sslConfigFor("postgres://u:p@h/db?ssl=true")).toEqual({
      rejectUnauthorized: true,
    });
    expect(sslConfigFor("postgres://u:p@h/db?ssl=1")).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("is case-insensitive", () => {
    expect(sslConfigFor("postgres://u:p@h/db?sslmode=REQUIRE")).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("returns false for unknown sslmode values (e.g., disable, prefer)", () => {
    expect(sslConfigFor("postgres://u:p@h/db?sslmode=disable")).toBe(false);
    expect(sslConfigFor("postgres://u:p@h/db?sslmode=prefer")).toBe(false);
  });
});
