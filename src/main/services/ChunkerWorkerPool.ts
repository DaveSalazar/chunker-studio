import { Worker } from "node:worker_threads";
import { join } from "node:path";
import type { ChunkSettings } from "../../shared/types";
import type { ChunkingOutcome } from "../core/chunking/domain/ChunkingEntities";

type PendingValue = ChunkingOutcome | number[];

interface PendingRequest {
  resolve: (value: PendingValue) => void;
  reject: (err: Error) => void;
}

interface WorkerResponse {
  id: number;
  ok: boolean;
  value?: PendingValue;
  error?: string;
}

/**
 * Owns a single long-lived worker thread for chunker-related CPU work
 * (full chunking + on-demand token counting). Multiple in-flight
 * requests are demuxed by id; the worker processes them serially.
 * Lazily started on first use.
 */
export class ChunkerWorkerPool {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();

  chunk(text: string, settings: ChunkSettings): Promise<ChunkingOutcome> {
    return this.send<ChunkingOutcome>({ kind: "chunk", text, settings });
  }

  countTokens(texts: string[]): Promise<number[]> {
    return this.send<number[]>({ kind: "count", texts });
  }

  /** Stops the worker. Pending requests are rejected. */
  async dispose(): Promise<void> {
    const worker = this.worker;
    this.worker = null;
    for (const [, p] of this.pending) {
      p.reject(new Error("ChunkerWorkerPool disposed"));
    }
    this.pending.clear();
    if (worker) await worker.terminate();
  }

  private send<T extends PendingValue>(payload: object): Promise<T> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (v) => resolve(v as T),
        reject,
      });
      worker.postMessage({ id, ...payload });
    });
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const path = join(__dirname, "workers", "chunker-worker.js");
    const w = new Worker(path);
    w.on("message", (res: WorkerResponse) => this.handleResponse(res));
    w.on("messageerror", (err) => {
      console.error("[ChunkerWorkerPool] messageerror", err);
      this.failAll(err instanceof Error ? err : new Error(String(err)));
    });
    w.on("error", (err) => {
      console.error("[ChunkerWorkerPool] worker error", err);
      this.failAll(err);
    });
    w.on("exit", (code) => {
      if (this.pending.size > 0) {
        this.failAll(new Error(`chunker-worker exited (code ${code}) with pending requests`));
      }
      if (this.worker === w) this.worker = null;
    });
    this.worker = w;
    return w;
  }

  private handleResponse(res: WorkerResponse): void {
    const p = this.pending.get(res.id);
    if (!p) return;
    this.pending.delete(res.id);
    if (res.ok && res.value !== undefined) p.resolve(res.value);
    else p.reject(new Error(res.error ?? "chunker-worker failed"));
  }

  private failAll(err: Error): void {
    for (const [, p] of this.pending) p.reject(err);
    this.pending.clear();
  }
}
