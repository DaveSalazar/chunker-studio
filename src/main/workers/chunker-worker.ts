// Long-lived worker that runs chunker-related CPU work off the main
// thread. Two message kinds:
//
//   - kind: "chunk"     → run the full pipeline against {text, settings}
//   - kind: "count"     → just tokenize and return per-text token counts
//
// One outstanding request at a time per worker is fine; both ops are
// fast and serializing them adds less latency than parallel workers.

import "reflect-metadata";
import { parentPort } from "node:worker_threads";
import { ArticleAwareChunker } from "../core/chunking/infrastructure/ArticleAwareChunker";
import { DefaultTextNormalizer } from "../core/chunking/infrastructure/DefaultTextNormalizer";
import { TiktokenCounter } from "../core/chunking/infrastructure/TiktokenCounter";
import type { ChunkSettings } from "../../shared/types";

if (!parentPort) {
  throw new Error("chunker-worker.ts must be loaded as a worker_thread");
}

const counter = new TiktokenCounter();
const chunker = new ArticleAwareChunker(new DefaultTextNormalizer(), counter);

type Request =
  | { id: number; kind: "chunk"; text: string; settings: ChunkSettings }
  | { id: number; kind: "count"; texts: string[] };

parentPort.on("message", (req: Request) => {
  try {
    if (req.kind === "chunk") {
      const outcome = chunker.chunk(req.text, req.settings);
      parentPort!.postMessage({ id: req.id, ok: true, value: outcome });
      return;
    }
    const counts = counter.countBatch(req.texts);
    parentPort!.postMessage({ id: req.id, ok: true, value: counts });
  } catch (err) {
    parentPort!.postMessage({
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
