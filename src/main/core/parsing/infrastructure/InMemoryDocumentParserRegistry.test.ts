import { describe, expect, it } from "vitest";
import "reflect-metadata";
import { InMemoryDocumentParserRegistry } from "./InMemoryDocumentParserRegistry";
import type { DocumentParser } from "../domain/DocumentParser";

const fakeParser = (extensions: string[]): DocumentParser => ({
  extensions,
  parse: async () => ({ text: "", warnings: [] }),
});

describe("InMemoryDocumentParserRegistry", () => {
  it("indexes parsers by their declared extensions", () => {
    const pdf = fakeParser(["pdf"]);
    const text = fakeParser(["txt", "md"]);
    const reg = new InMemoryDocumentParserRegistry([pdf, text]);
    expect(reg.resolve("pdf")).toBe(pdf);
    expect(reg.resolve("txt")).toBe(text);
    expect(reg.resolve("md")).toBe(text);
  });

  it("returns null for unknown extensions", () => {
    const reg = new InMemoryDocumentParserRegistry([fakeParser(["pdf"])]);
    expect(reg.resolve("xlsx")).toBeNull();
  });

  it("matches case-insensitively", () => {
    const pdf = fakeParser(["pdf"]);
    const reg = new InMemoryDocumentParserRegistry([pdf]);
    expect(reg.resolve("PDF")).toBe(pdf);
    expect(reg.resolve("Pdf")).toBe(pdf);
  });

  it("normalizes parser-declared extensions to lowercase too", () => {
    const docx = fakeParser(["DOCX"]);
    const reg = new InMemoryDocumentParserRegistry([docx]);
    expect(reg.resolve("docx")).toBe(docx);
  });

  it("later parsers overwrite earlier ones for the same extension", () => {
    const a = fakeParser(["txt"]);
    const b = fakeParser(["txt"]);
    const reg = new InMemoryDocumentParserRegistry([a, b]);
    expect(reg.resolve("txt")).toBe(b);
  });

  it("returns null when constructed with no parsers", () => {
    const reg = new InMemoryDocumentParserRegistry([]);
    expect(reg.resolve("pdf")).toBeNull();
  });
});
