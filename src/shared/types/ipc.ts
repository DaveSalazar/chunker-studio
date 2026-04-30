// IPC envelope shared between main, preload, and renderer.

export type IpcSuccess<T> = { ok: true; value: T };
export type IpcFailure = { ok: false; error: string };
export type IpcResult<T> = IpcSuccess<T> | IpcFailure;

/** OpenAI text-embedding-3-small price per 1M tokens, in USD. */
export const PRICE_PER_M_TOKENS_USD = 0.02;
