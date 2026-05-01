import { describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { TextDocumentParser } from "./TextDocumentParser";
import type { FileSystemRepository } from "../../filesystem/domain/FileSystemRepository";

const fsMock = (text = "hello"): FileSystemRepository =>
  ({
    readUtf8: vi.fn().mockResolvedValue(text),
    pickFiles: vi.fn(),
    pickFolder: vi.fn(),
    listSupported: vi.fn(),
    stat: vi.fn(),
    readBytes: vi.fn(),
  }) as unknown as FileSystemRepository;

describe("TextDocumentParser", () => {
  it("declares txt + md as the supported extensions", () => {
    const fs = fsMock();
    const p = new TextDocumentParser(fs);
    expect(p.extensions).toEqual(["txt", "md"]);
  });

  it("reads the file as UTF-8 and returns the text in a ParsedDocument shape", async () => {
    const fs = fsMock("# Title\n\nbody");
    const p = new TextDocumentParser(fs);
    const result = await p.parse("/notes.md");
    expect(fs.readUtf8).toHaveBeenCalledWith("/notes.md");
    expect(result).toEqual({ text: "# Title\n\nbody", warnings: [] });
  });
});
