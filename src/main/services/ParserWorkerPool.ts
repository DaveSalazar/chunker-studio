import { Worker } from "node:worker_threads";
import { join } from "node:path";

interface PendingRequest {
  resolve: (out: ParseSuccess["value"]) => void;
  reject: (err: Error) => void;
}

export type ParseKind = "pdf" | "docx" | "text";

type UnsupportedParseReason = "scanned-pdf";

interface ParseSuccess {
  id: number;
  ok: true;
  value: {
    text: string;
    pageCount?: number;
    pageOffsets?: number[];
    warnings: string[];
    unsupportedReason?: UnsupportedParseReason;
  };
}
interface ParseFailure {
  id: number;
  ok: false;
  error: string;
}
type ParseResponse = ParseSuccess | ParseFailure;

/**
 * Long-lived parser worker. Bytes are transferred (not copied) into the
 * worker via the second argument to postMessage so a 50-page PDF
 * doesn't pay a memcpy on the main thread. Multiple concurrent requests
 * are demuxed by id; the worker processes them serially.
 */
export class ParserWorkerPool {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();

  parse(
    kind: ParseKind,
    bytes: Uint8Array,
  ): Promise<ParseSuccess["value"]> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    console.log("[ParserWorkerPool] post id=", id, "kind=", kind, "bytes=", bytes.length);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      // Transfer the underlying ArrayBuffer so a 50-page PDF doesn't
      // pay a memcpy. Cast through ArrayBuffer because Uint8Array's
      // `.buffer` is typed as ArrayBufferLike under strict TS.
      const transfer = bytes.buffer as ArrayBuffer;
      worker.postMessage({ id, kind, bytes }, [transfer]);
    });
  }

  async dispose(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    for (const [, p] of this.pending) {
      p.reject(new Error("ParserWorkerPool disposed"));
    }
    this.pending.clear();
    if (worker) await worker.terminate();
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const path = join(__dirname, "workers", "parser-worker.js");
    console.log("[ParserWorkerPool] spawning worker at", path);
    const w = new Worker(path);
    console.log("[ParserWorkerPool] worker spawned, threadId=", w.threadId);
    w.on("message", (res: ParseResponse) => this.handleResponse(res));
    w.on("messageerror", (err) => {
      console.error("[ParserWorkerPool] messageerror", err);
      this.failAll(err instanceof Error ? err : new Error(String(err)));
    });
    w.on("error", (err) => {
      console.error("[ParserWorkerPool] worker error", err);
      this.failAll(err);
    });
    w.on("exit", (code) => {
      // Reject any in-flight requests regardless of exit code — a clean
      // exit without a reply still strands the caller.
      if (this.pending.size > 0) {
        this.failAll(new Error(`parser-worker exited (code ${code}) with pending requests`));
      }
      if (this.worker === w) this.worker = null;
    });
    this.worker = w;
    return w;
  }

  private handleResponse(res: ParseResponse): void {
    const p = this.pending.get(res.id);
    if (!p) return;
    this.pending.delete(res.id);
    if (res.ok) p.resolve(res.value);
    else p.reject(new Error(res.error));
  }

  private failAll(err: Error): void {
    for (const [, p] of this.pending) p.reject(err);
    this.pending.clear();
  }
}
