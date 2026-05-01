import { describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { ParseDocumentUseCase } from "./ParseDocumentUseCase";
import { UnsupportedFormatError } from "../domain/ParsingEntities";
import type { DocumentParserRegistry } from "../domain/DocumentParser";
import type { StatFileUseCase } from "../../filesystem/application/StatFileUseCase";

const stat = (extension = "pdf"): StatFileUseCase =>
  ({
    execute: vi.fn().mockResolvedValue({
      path: "/x.pdf",
      name: "x.pdf",
      extension,
      size: 100,
      modifiedAt: 1,
    }),
  }) as unknown as StatFileUseCase;

const registry = (parser: { parse: ReturnType<typeof vi.fn> } | null): DocumentParserRegistry =>
  ({
    resolve: vi.fn().mockReturnValue(parser),
  }) as unknown as DocumentParserRegistry;

describe("ParseDocumentUseCase", () => {
  it("happy path: stats the file, resolves a parser, parses, and returns both", async () => {
    const parser = { parse: vi.fn().mockResolvedValue({ text: "body", warnings: [] }) };
    const useCase = new ParseDocumentUseCase(registry(parser), stat("pdf"));
    const result = await useCase.execute("/x.pdf");
    expect(result.metadata.extension).toBe("pdf");
    expect(result.document).toEqual({ text: "body", warnings: [] });
    expect(parser.parse).toHaveBeenCalledWith("/x.pdf");
  });

  it("throws UnsupportedFormatError when no parser is registered for the extension", async () => {
    const useCase = new ParseDocumentUseCase(registry(null), stat("xlsx"));
    await expect(useCase.execute("/x.xlsx")).rejects.toBeInstanceOf(
      UnsupportedFormatError,
    );
  });

  it("the unsupported error message includes the dotted extension", async () => {
    const useCase = new ParseDocumentUseCase(registry(null), stat("xlsx"));
    await expect(useCase.execute("/x.xlsx")).rejects.toThrow(/\.xlsx/);
  });

  it("propagates a parser error unchanged", async () => {
    const parser = { parse: vi.fn().mockRejectedValue(new Error("parse blew up")) };
    const useCase = new ParseDocumentUseCase(registry(parser), stat("pdf"));
    await expect(useCase.execute("/x.pdf")).rejects.toThrow("parse blew up");
  });
});
