import { describe, expect, it, vi } from "vitest";

// chunkerClient.ChunkerError is the only piece the runner imports
// from the renderer client. Provide a tiny shim so the runner can
// type-check the missing-config branch without standing up Electron.
vi.mock("@/services/chunker-client", () => {
  class ChunkerError extends Error {}
  return {
    ChunkerError,
    chunkerClient: {
      ingest: vi.fn(),
      onIngestProgress: vi.fn(() => () => undefined),
    },
  };
});

import { ChunkerError } from "@/services/chunker-client";
import {
  runIndexAllBatch,
  type IndexAllDeps,
  type IndexAllPhase,
} from "./useIndexAllFlow";
import type { IndexableDocument } from "@/hooks/session/types";
import type { IngestSummary, SchemaProfile } from "@shared/types";

const profile: SchemaProfile = {
  id: "p",
  name: "P",
  description: "",
  table: "t",
  textColumn: "text",
  embeddingColumn: "embedding",
  articleColumn: null,
  headingColumn: null,
  documentFields: [
    {
      key: "name",
      column: "name",
      label: "Name",
      kind: "text",
      required: true,
      isSourceKey: true,
    },
  ],
  chunking: "articleAware",
  embedding: { providerId: "openai", model: "x", dimensions: 1536 },
};

const doc = (id: string, fileName: string): IndexableDocument => ({
  id,
  fileName,
  path: `/test/${fileName}`,
  chunks: [
    {
      index: 1,
      article: null,
      heading: null,
      text: "x",
      body: null,
      charCount: 1,
      tokenCount: 1,
      startOffset: 0,
      endOffset: 1,
    },
  ],
  totalTokens: 1,
});

const summary = (over: Partial<IngestSummary> = {}): IngestSummary => ({
  jobId: "j",
  profileId: "p",
  documentFieldValues: {},
  chunksEmbedded: 1,
  chunksDeleted: 0,
  chunksInserted: 1,
  promptTokens: 1,
  durationMs: 1,
  ...over,
});

interface Harness {
  ingest: ReturnType<typeof vi.fn>;
  /** Plain capture sink — typed inline so it satisfies the runner's
   *  `(p: IndexAllPhase) => void` callback without a vi.fn cast. */
  emit: (p: IndexAllPhase) => void;
  deps: IndexAllDeps;
  phases: IndexAllPhase[];
}

const harness = (
  ingestImpl: (...args: unknown[]) => Promise<IngestSummary>,
): Harness => {
  const ingest = vi.fn(ingestImpl);
  let nextJob = 0;
  const phases: IndexAllPhase[] = [];
  const emit = (p: IndexAllPhase) => {
    phases.push(p);
  };
  const deps: IndexAllDeps = {
    ingest: ingest as unknown as IndexAllDeps["ingest"],
    newJobId: () => `job-${++nextJob}`,
  };
  return { ingest, emit, deps, phases };
};

describe("runIndexAllBatch", () => {
  it("returns immediately for an empty batch (no ingest, no emits)", async () => {
    const h = harness(() => Promise.resolve(summary()));
    await runIndexAllBatch(profile, [], h.deps, h.emit);
    expect(h.ingest).not.toHaveBeenCalled();
    expect(h.phases).toEqual([]);
  });

  it("indexes every doc sequentially and emits a final 'done' phase", async () => {
    const h = harness(() => Promise.resolve(summary({ chunksInserted: 5 })));
    await runIndexAllBatch(
      profile,
      [doc("a", "a.docx"), doc("b", "b.docx")],
      h.deps,
      h.emit,
    );
    expect(h.ingest).toHaveBeenCalledTimes(2);
    const last = h.phases[h.phases.length - 1];
    expect(last.kind).toBe("done");
    if (last.kind !== "done") return;
    expect(last.results).toHaveLength(2);
    expect(last.results.every((r) => r.ok)).toBe(true);
  });

  it("preserves call order — doc i is ingested before doc i+1 starts", async () => {
    const order: string[] = [];
    const h = harness(async (req) => {
      const r = req as { documentFieldValues: { name?: string } };
      order.push(r.documentFieldValues.name ?? "");
      return summary();
    });
    await runIndexAllBatch(
      profile,
      [doc("a", "first.docx"), doc("b", "second.docx"), doc("c", "third.docx")],
      h.deps,
      h.emit,
    );
    expect(order).toEqual(["first", "second", "third"]);
  });

  it("derives per-doc field values from the filename via initialValuesForProfile", async () => {
    const h = harness(() => Promise.resolve(summary()));
    await runIndexAllBatch(profile, [doc("a", "minuta.docx")], h.deps, h.emit);
    expect(h.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "p",
        documentFieldValues: { name: "minuta" },
      }),
    );
  });

  it("uses caller-supplied valuesByDocId overrides when provided", async () => {
    const h = harness(() => Promise.resolve(summary()));
    await runIndexAllBatch(
      profile,
      [doc("a", "minuta.docx"), doc("b", "demanda.docx")],
      h.deps,
      h.emit,
      { a: { name: "operator-edited" } }, // b falls back to filename-derived
    );
    expect(h.ingest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ documentFieldValues: { name: "operator-edited" } }),
    );
    expect(h.ingest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ documentFieldValues: { name: "demanda" } }),
    );
  });

  it("captures a per-doc error and continues with the rest of the batch", async () => {
    let call = 0;
    const h = harness(() => {
      call++;
      if (call === 2) return Promise.reject(new Error("openai 429"));
      return Promise.resolve(summary({ chunksInserted: 3 }));
    });
    await runIndexAllBatch(
      profile,
      [doc("a", "a.docx"), doc("b", "b.docx"), doc("c", "c.docx")],
      h.deps,
      h.emit,
    );
    const last = h.phases[h.phases.length - 1];
    if (last.kind !== "done") throw new Error(`expected done, got ${last.kind}`);
    expect(last.results.map((r) => r.ok)).toEqual([true, false, true]);
    const failed = last.results[1];
    if (failed.ok) throw new Error("expected failure for doc b");
    expect(failed.error).toContain("openai 429");
  });

  it("bails to the error phase when the first doc reports a missing-config ChunkerError", async () => {
    const h = harness(() =>
      Promise.reject(new ChunkerError("Configuration is missing: openaiApiKey")),
    );
    await runIndexAllBatch(
      profile,
      [doc("a", "a.docx"), doc("b", "b.docx")],
      h.deps,
      h.emit,
    );
    expect(h.ingest).toHaveBeenCalledTimes(1);
    const last = h.phases[h.phases.length - 1];
    expect(last.kind).toBe("error");
    if (last.kind !== "error") return;
    expect(last.missingConfig).toBe(true);
  });

  it("skips a doc whose required fields cannot be filled, no ingest call for it", async () => {
    const h = harness(() => Promise.resolve(summary()));
    // Empty filename → defaultSourceName returns "" → required `name` blank.
    await runIndexAllBatch(
      profile,
      [doc("a", ""), doc("b", "b.docx")],
      h.deps,
      h.emit,
    );
    expect(h.ingest).toHaveBeenCalledTimes(1);
    const last = h.phases[h.phases.length - 1];
    if (last.kind !== "done") throw new Error("expected done");
    const [first, second] = last.results;
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(true);
  });

  it("emits a 'running' phase per doc with currentIndex incrementing", async () => {
    const h = harness(() => Promise.resolve(summary()));
    await runIndexAllBatch(
      profile,
      [doc("a", "a.docx"), doc("b", "b.docx")],
      h.deps,
      h.emit,
    );
    const runningPhases = h.phases.filter(
      (p): p is Extract<IndexAllPhase, { kind: "running" }> => p.kind === "running",
    );
    // Initial seed + one re-emit per doc as the current pointer advances.
    const indices = runningPhases.map((p) => p.currentIndex);
    expect(indices).toContain(0);
    expect(indices).toContain(1);
  });
});
