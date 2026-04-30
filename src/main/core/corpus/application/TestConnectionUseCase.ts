import { inject, injectable } from "inversify";
import { CorpusLocator } from "../domain/CorpusLocator";
import type { CorpusRepository } from "../domain/CorpusRepository";

export interface ConnectionTestResult {
  /** Server version string from `SELECT version()`. */
  version: string;
  /** Wall-clock duration of the round trip, in ms. */
  durationMs: number;
}

@injectable()
export class TestConnectionUseCase {
  constructor(
    @inject(CorpusLocator.CorpusRepository)
    private readonly corpus: CorpusRepository,
  ) {}

  /**
   * Accepts a candidate URL rather than reading from config so the user
   * can validate a value they're about to save (or has typed
   * differently from what's stored).
   */
  async execute(databaseUrl: string): Promise<ConnectionTestResult> {
    const trimmed = databaseUrl.trim();
    if (trimmed.length === 0) {
      throw new Error("Database URL is empty");
    }
    const startedAt = Date.now();
    const version = await this.corpus.ping(trimmed);
    return {
      version,
      durationMs: Date.now() - startedAt,
    };
  }
}
