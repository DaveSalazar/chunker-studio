import type { IpcResult } from "../../shared/types";

const MAX_ERROR_LENGTH = 500;

/**
 * Convert a thrown exception into a serializable failure envelope.
 * Keeps the renderer free of try/catch noise around every IPC call.
 *
 * Caps the reflected error string at `MAX_ERROR_LENGTH` so a 50KB
 * stack trace from `pg` / `mammoth` / pdfjs doesn't end up rendered
 * verbatim in a toast or screenshotted into a support ticket.
 */
export async function wrap<T>(fn: () => Promise<T> | T): Promise<IpcResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: truncate(message) };
  }
}

function truncate(s: string): string {
  return s.length > MAX_ERROR_LENGTH ? s.slice(0, MAX_ERROR_LENGTH) + "…" : s;
}
