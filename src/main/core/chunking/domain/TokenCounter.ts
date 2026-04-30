export interface TokenCounter {
  /** Count tokens for a single string. */
  count(text: string): number;
  /** Sum of tokens across many strings, batched for speed. */
  countBatch(texts: string[]): number[];
}
