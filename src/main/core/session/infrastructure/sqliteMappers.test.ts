import { describe, expect, it } from "vitest";
import { chunkParams, parsedRowToDomain, runRowToDomain } from "./sqliteMappers";
import type { ChunkRow, ParsedRow, RunRow } from "./sqliteStatements";
import type { ChunkRecord } from "../../../../shared/types";

const baseParsedRow = (overrides: Partial<ParsedRow> = {}): ParsedRow => ({
  text: "body",
  page_count: null,
  page_offsets_json: null,
  warnings_json: "[]",
  path: "/foo.pdf",
  name: "foo.pdf",
  extension: "pdf",
  unsupported_reason: null,
  ...overrides,
});

const baseRunRow = (overrides: Partial<RunRow> = {}): RunRow => ({
  settings_json: "{}",
  total_tokens: 0,
  total_chars: 0,
  strategy: "article",
  normalized_text: "",
  estimated_cost_usd: 0,
  ...overrides,
});

const baseChunkRow = (overrides: Partial<ChunkRow> = {}): ChunkRow => ({
  chunk_index: 1,
  article: null,
  heading: null,
  text: "x",
  char_count: 1,
  token_count: 1,
  start_offset: 0,
  end_offset: 1,
  manually_edited: 0,
  ...overrides,
});

const chunk = (overrides: Partial<ChunkRecord> = {}): ChunkRecord => ({
  index: 1,
  article: null,
  heading: null,
  text: "x",
  charCount: 1,
  tokenCount: 1,
  startOffset: 0,
  endOffset: 1,
  ...overrides,
});

describe("parsedRowToDomain", () => {
  it("maps snake_case columns to camelCase fields", () => {
    const row = baseParsedRow({ page_count: 7 });
    expect(parsedRowToDomain(row)).toMatchObject({
      path: "/foo.pdf",
      name: "foo.pdf",
      extension: "pdf",
      text: "body",
      pageCount: 7,
    });
  });

  it("normalizes null page_count to undefined (not 0)", () => {
    const dom = parsedRowToDomain(baseParsedRow({ page_count: null }));
    expect(dom.pageCount).toBeUndefined();
  });

  it("parses page_offsets_json into a number[]", () => {
    const dom = parsedRowToDomain(
      baseParsedRow({ page_offsets_json: "[0,100,250]" }),
    );
    expect(dom.pageOffsets).toEqual([0, 100, 250]);
  });

  it("treats a malformed page_offsets_json as undefined (pre-v3 cached row)", () => {
    const dom = parsedRowToDomain(baseParsedRow({ page_offsets_json: "not json" }));
    expect(dom.pageOffsets).toBeUndefined();
  });

  it("filters non-number entries out of pageOffsets", () => {
    const dom = parsedRowToDomain(
      baseParsedRow({ page_offsets_json: '[0,"x",100]' }),
    );
    // Mixed array → reject the whole thing as malformed.
    expect(dom.pageOffsets).toBeUndefined();
  });

  it("only sets unsupportedReason when row says 'scanned-pdf'", () => {
    expect(
      parsedRowToDomain(baseParsedRow({ unsupported_reason: "scanned-pdf" }))
        .unsupportedReason,
    ).toBe("scanned-pdf");
    expect(
      parsedRowToDomain(baseParsedRow({ unsupported_reason: null }))
        .unsupportedReason,
    ).toBeUndefined();
    expect(
      parsedRowToDomain(baseParsedRow({ unsupported_reason: "other" }))
        .unsupportedReason,
    ).toBeUndefined();
  });

  it("parses warnings_json (defaults to [] on bad JSON)", () => {
    expect(
      parsedRowToDomain(baseParsedRow({ warnings_json: '["a","b"]' })).warnings,
    ).toEqual(["a", "b"]);
    expect(parsedRowToDomain(baseParsedRow({ warnings_json: "{" })).warnings).toEqual(
      [],
    );
  });
});

describe("runRowToDomain", () => {
  it("normalizes unknown strategy strings to 'article'", () => {
    const dom = runRowToDomain(baseRunRow({ strategy: "weird" }), []);
    expect(dom.result.strategy).toBe("article");
  });

  it("preserves 'paragraph' strategy", () => {
    const dom = runRowToDomain(baseRunRow({ strategy: "paragraph" }), []);
    expect(dom.result.strategy).toBe("paragraph");
  });

  it("collects manually-edited chunk indices", () => {
    const chunks = [
      baseChunkRow({ chunk_index: 1, manually_edited: 0 }),
      baseChunkRow({ chunk_index: 2, manually_edited: 1 }),
      baseChunkRow({ chunk_index: 3, manually_edited: 1 }),
    ];
    const dom = runRowToDomain(baseRunRow(), chunks);
    expect(dom.manuallyEditedIndices).toEqual([2, 3]);
  });

  it("re-keys snake_case fields on chunks (chunk_index → index)", () => {
    const dom = runRowToDomain(baseRunRow(), [
      baseChunkRow({ chunk_index: 5, char_count: 10, token_count: 4 }),
    ]);
    expect(dom.result.chunks[0]).toMatchObject({
      index: 5,
      charCount: 10,
      tokenCount: 4,
    });
  });
});

describe("chunkParams", () => {
  it("flattens (textHash, settingsHash, index, ChunkRecord) into one bind shape", () => {
    const params = chunkParams("th", "sh", 7, chunk({ article: "1", heading: "H" }));
    expect(params).toEqual({
      textHash: "th",
      settingsHash: "sh",
      chunkIndex: 7,
      article: "1",
      heading: "H",
      text: "x",
      charCount: 1,
      tokenCount: 1,
      startOffset: 0,
      endOffset: 1,
    });
  });
});
