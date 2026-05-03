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
import { CompositeChunker } from "../core/chunking/infrastructure/CompositeChunker";
import { DefaultTextNormalizer } from "../core/chunking/infrastructure/DefaultTextNormalizer";
import { DefaultPlaceholderNormalizer } from "../core/chunking/infrastructure/DefaultPlaceholderNormalizer";
import { TiktokenCounter } from "../core/chunking/infrastructure/TiktokenCounter";
import { WholeDocumentChunker } from "../core/chunking/infrastructure/WholeDocumentChunker";
import type { ChunkSettings } from "../../shared/types";

if (!parentPort) {
  throw new Error("chunker-worker.ts must be loaded as a worker_thread");
}

// Worker doesn't share the Inversify container with the main process —
// it instantiates the same component chunkers + dispatcher manually.
// Keep this in sync with core/index.ts so behavior matches.
const counter = new TiktokenCounter();
const normalizer = new DefaultTextNormalizer();
const placeholders = new DefaultPlaceholderNormalizer();
const articleAware = new ArticleAwareChunker(normalizer, counter);
const wholeDocument = new WholeDocumentChunker(normalizer, placeholders, counter);
const chunker = new CompositeChunker(articleAware, wholeDocument);

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
