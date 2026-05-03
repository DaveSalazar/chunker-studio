import { describe, expect, it } from "vitest";
import "reflect-metadata";
import { WholeDocumentChunker } from "./WholeDocumentChunker";
import { DefaultTextNormalizer } from "./DefaultTextNormalizer";
import { DefaultPlaceholderNormalizer } from "./DefaultPlaceholderNormalizer";
import type { ChunkSettings } from "../domain/ChunkingEntities";
import type { TokenCounter } from "../domain/TokenCounter";

const settings = (overrides: Partial<ChunkSettings> = {}): ChunkSettings => ({
  maxChunkTokens: 500,
  minChunkChars: 20,
  headingLookback: 600,
  letterRatio: 40,
  dehyphenate: true,
  splitByArticle: true,
  chunkingStrategy: "wholeDocument",
  normalizePlaceholders: false,
  ...overrides,
});

const fakeTokens: TokenCounter = {
  count: (t) => Math.ceil(t.length / 4),
  countBatch: (texts) => texts.map((t) => Math.ceil(t.length / 4)),
};

const make = (): WholeDocumentChunker =>
  new WholeDocumentChunker(
    new DefaultTextNormalizer(),
    new DefaultPlaceholderNormalizer(),
    fakeTokens,
  );

describe("WholeDocumentChunker", () => {
  it("emits exactly one chunk per input", () => {
    const text = "MINUTA ACLARATORIA Y RECTIFICATORIA\n\nCuerpo del documento.";
    const result = make().chunk(text, settings());
    expect(result.chunks).toHaveLength(1);
    expect(result.strategy).toBe("wholeDocument");
  });

  it("body field carries the full normalized text", () => {
    const text = "MINUTA ACLARATORIA\n\nLínea 2\n\nLínea 3";
    const result = make().chunk(text, settings());
    expect(result.chunks[0].body).toBe("MINUTA ACLARATORIA\n\nLínea 2\n\nLínea 3");
  });

  it("text field embeds an intent surface (≤ 1500 chars)", () => {
    const long = "x".repeat(5000);
    const result = make().chunk(long, settings());
    expect(result.chunks[0].text.length).toBe(1500);
  });

  it("text equals body when the full text fits in the intent surface", () => {
    const text = "MINUTA ACLARATORIA Y RECTIFICATORIA\n\nCuerpo corto.";
    const result = make().chunk(text, settings());
    expect(result.chunks[0].text).toBe(result.chunks[0].body);
  });

  it("article + heading are null (whole-document chunks aren't keyed by article)", () => {
    const result = make().chunk("MINUTA ACLARATORIA\n\nCuerpo.", settings());
    expect(result.chunks[0].article).toBeNull();
    expect(result.chunks[0].heading).toBeNull();
  });

  it("totalTokens / totalChars reflect the single chunk", () => {
    const text = "MINUTA ACLARATORIA\n\nCuerpo corto.";
    const result = make().chunk(text, settings());
    expect(result.totalTokens).toBe(result.chunks[0].tokenCount);
    expect(result.totalChars).toBe(text.length);
  });

  it("returns an empty result for empty input (matches codes' behavior)", () => {
    const result = make().chunk("", settings());
    expect(result.chunks).toEqual([]);
    expect(result.totalTokens).toBe(0);
    expect(result.totalChars).toBe(0);
  });

  it("returns an empty result for whitespace-only input", () => {
    const result = make().chunk("   \n\n   \n", settings());
    expect(result.chunks).toEqual([]);
  });

  it("runs the placeholder normalizer when the flag is on", () => {
    const text = "MINUTA\n\nNOMBRE: ___________________\n\nCédula: ____________";
    const result = make().chunk(text, settings({ normalizePlaceholders: true }));
    expect(result.chunks[0].body).toContain("<<NOMBRE COMPLETO>>");
    expect(result.chunks[0].body).toContain("<<NÚMERO DE CÉDULA>>");
  });

  it("leaves placeholders untouched when the flag is off", () => {
    const text = "MINUTA\n\nNOMBRE: ___________________";
    const result = make().chunk(text, settings({ normalizePlaceholders: false }));
    expect(result.chunks[0].body).not.toContain("<<NOMBRE COMPLETO>>");
    expect(result.chunks[0].body).toContain("___");
  });

  it("dehyphenates when the flag is on", () => {
    const text = "MINUTA\n\nEl deman-\ndante alegó que…";
    const result = make().chunk(text, settings({ dehyphenate: true }));
    expect(result.chunks[0].body).toContain("demandante");
  });

  it("offsets bracket the entire body (start=0, end=body.length)", () => {
    const text = "MINUTA\n\nCuerpo corto pero suficiente.";
    const result = make().chunk(text, settings());
    expect(result.chunks[0].startOffset).toBe(0);
    expect(result.chunks[0].endOffset).toBe(result.chunks[0].body!.length);
  });
});
