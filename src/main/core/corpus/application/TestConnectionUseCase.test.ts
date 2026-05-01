import { describe, expect, it, vi } from "vitest";
import "reflect-metadata";
import { TestConnectionUseCase } from "./TestConnectionUseCase";
import type { CorpusRepository } from "../domain/CorpusRepository";

const corpus = (
  ping: (url: string) => Promise<string> = async () => "PostgreSQL 16.0",
): CorpusRepository =>
  ({
    ping: vi.fn(ping),
    writeChunks: vi.fn(),
  }) as unknown as CorpusRepository;

describe("TestConnectionUseCase", () => {
  it("trims whitespace before pinging", async () => {
    const repo = corpus();
    await new TestConnectionUseCase(repo).execute("  postgres://h/db  ");
    expect(repo.ping).toHaveBeenCalledWith("postgres://h/db");
  });

  it("rejects an empty URL with a clear message", async () => {
    const repo = corpus();
    await expect(new TestConnectionUseCase(repo).execute("")).rejects.toThrow(
      /Database URL is empty/,
    );
    expect(repo.ping).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only URL with the same message", async () => {
    const repo = corpus();
    await expect(new TestConnectionUseCase(repo).execute("   ")).rejects.toThrow(
      /Database URL is empty/,
    );
  });

  it("returns the version reported by ping plus a non-negative durationMs", async () => {
    const repo = corpus(async () => "PostgreSQL 17.1");
    const result = await new TestConnectionUseCase(repo).execute("postgres://x");
    expect(result.version).toBe("PostgreSQL 17.1");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("propagates ping errors (caller handles them)", async () => {
    const repo = corpus(async () => {
      throw new Error("connection refused");
    });
    await expect(
      new TestConnectionUseCase(repo).execute("postgres://x"),
    ).rejects.toThrow("connection refused");
  });
});
