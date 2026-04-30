import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ChunkSettings } from "@shared/types";
import { chunkerClient } from "@/services/chunker-client";
import { effectiveSettingsFor, settingsKey, updateDocById } from "./helpers";
import type {
  ChunkerSessionState,
  DocumentEntry,
  SettingsScope,
} from "./types";

type SetState = Dispatch<SetStateAction<ChunkerSessionState>>;

export interface RechunkEffectDeps {
  documents: DocumentEntry[];
  globalSettings: ChunkSettings;
  scope: SettingsScope;
  setState: SetState;
  /** Per-doc signature cache so identical (text, settings) pairs only re-chunk once. */
  lastChunked: MutableRefObject<Map<string, string>>;
  /** Doc ids whose view should auto-flip to "parsed" once chunking completes. */
  autoFlipPending: MutableRefObject<Set<string>>;
}

/**
 * Watches the active set of documents (debounced) and rechunks any doc
 * whose (parsed text, effective settings) hasn't been chunked yet. Only
 * docs that already have parsed text and are NOT in "unparsed" qualify.
 * A doc reaches here either because the user just clicked Parse
 * (loading="chunking") or because settings changed and the doc is
 * "ready". The first-chunk path also auto-flips the view to "parsed".
 */
export function useRechunkEffect(deps: RechunkEffectDeps): void {
  const { documents, globalSettings, scope, setState, lastChunked, autoFlipPending } = deps;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const doc of documents) {
        if (!doc.parsed) continue;
        if (doc.loading === "unparsed" || doc.loading === "parsing") continue;
        if (doc.parsed.unsupportedReason) continue;
        // Manual edits win — skip auto re-chunk until the user asks for
        // a reset. On restore, manualMode docs come back with result=null
        // and need one cache-hit pass to repopulate; allow that pass.
        if (doc.manualMode && doc.result) continue;
        const settings = effectiveSettingsFor(doc, scope, globalSettings);
        const sig = `${doc.parsed.text.length}::${settingsKey(settings)}`;
        if (lastChunked.current.get(doc.id) === sig) continue;

        try {
          const result = await chunkerClient.chunk(doc.parsed.text, settings);
          if (cancelled) return;
          // Only memoize the (doc, sig) pair AFTER the chunk actually
          // committed. Setting it pre-await caused a stuck-state when
          // the effect was re-run mid-flight: the cleanup flagged the
          // in-flight call as cancelled, and the next mount skipped
          // because the sig was already memoized — the doc never left
          // "chunking".
          lastChunked.current.set(doc.id, sig);
          const flip = autoFlipPending.current.delete(doc.id);
          setState((s) =>
            updateDocById(s, doc.id, {
              result,
              loading: "ready",
              error: null,
              ...(flip ? { view: "parsed" as const } : {}),
            }),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (cancelled) return;
          autoFlipPending.current.delete(doc.id);
          console.error("[chunking] failed", doc.file.path, err);
          setState((s) => updateDocById(s, doc.id, { loading: "error", error: message }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documents, globalSettings, scope, setState, lastChunked, autoFlipPending]);
}
