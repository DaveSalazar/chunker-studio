import type { IpcResult } from "../../shared/types";

/**
 * Convert a thrown exception into a serializable failure envelope.
 * Keeps the renderer free of try/catch noise around every IPC call.
 */
export async function wrap<T>(fn: () => Promise<T> | T): Promise<IpcResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
