import { useMemo } from "react";
import type { ChunkerSession, ChunkerSessionState, DocumentEntry } from "./types";
import { effectiveSettingsFor } from "./helpers";

type Totals = ChunkerSession["totals"];

export interface DerivedSession {
  active: DocumentEntry | null;
  effectiveSettings: ChunkerSession["effectiveSettings"];
  totals: Totals;
  loadedPaths: ReadonlySet<string>;
  parsedPaths: ReadonlySet<string>;
}

/** Per-render memoized projections used by the workspace + folder UI. */
export function useDerived(state: ChunkerSessionState): DerivedSession {
  const active = useMemo(
    () => state.documents.find((d) => d.id === state.activeId) ?? null,
    [state.documents, state.activeId],
  );

  const effectiveSettings = useMemo(
    () =>
      active
        ? effectiveSettingsFor(active, state.scope, state.globalSettings)
        : state.globalSettings,
    [active, state.scope, state.globalSettings],
  );

  const totals = useMemo<Totals>(() => {
    let chunks = 0, tokens = 0, usd = 0;
    for (const doc of state.documents) {
      if (!doc.result) continue;
      chunks += doc.result.chunks.length;
      tokens += doc.result.totalTokens;
      usd += doc.result.estimatedCostUsd;
    }
    return { documents: state.documents.length, chunks, tokens, usd };
  }, [state.documents]);

  const loadedPaths = useMemo(
    () => new Set(state.documents.map((d) => d.file.path)),
    [state.documents],
  );
  const parsedPaths = useMemo(
    () =>
      new Set(
        state.documents
          .filter((d) => d.parsed !== null)
          .map((d) => d.file.path),
      ),
    [state.documents],
  );

  return { active, effectiveSettings, totals, loadedPaths, parsedPaths };
}
