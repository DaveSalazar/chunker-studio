import { injectable } from "inversify";
import { getEncoding, type Tiktoken } from "js-tiktoken";
import type { TokenCounter } from "../domain/TokenCounter";

/**
 * cl100k_base is the encoding used by `text-embedding-3-small` / -3-large.
 * Lazily initialized so importing this module is cheap.
 */
@injectable()
export class TiktokenCounter implements TokenCounter {
  private encoder: Tiktoken | null = null;

  private getEncoder(): Tiktoken {
    if (!this.encoder) this.encoder = getEncoding("cl100k_base");
    return this.encoder;
  }

  count(text: string): number {
    return this.getEncoder().encode(text).length;
  }

  countBatch(texts: string[]): number[] {
    const enc = this.getEncoder();
    return texts.map((t) => enc.encode(t).length);
  }
}
