import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { FolderEntry, OpenedFile } from "@shared/types";
import { chunkerClient } from "@/services/chunker-client";
import {
  applyLoadEntry,
  asOpenedFile,
  makeDocFromFile,
  newId,
  updateDocById,
} from "./helpers";
import type { ChunkerSessionState, DocumentEntry } from "./types";

type SetState = Dispatch<SetStateAction<ChunkerSessionState>>;

export interface ParseFlowDeps {
  state: ChunkerSessionState;
  setState: SetState;
  autoFlipPending: MutableRefObject<Set<string>>;
}

export interface ParseFlow {
  parseById: (id: string, opts?: { autoFlip?: boolean }) => Promise<void>;
  addFiles: (files: OpenedFile[]) => void;
  parseDocument: (id: string) => void;
  loadEntry: (entry: FolderEntry, opts?: { permanent?: boolean }) => void;
  parseAllEntries: () => void;
}

export function useParseFlow(deps: ParseFlowDeps): ParseFlow {
  const { state, setState, autoFlipPending } = deps;

  // Latest committed state, mirrored into a ref each render. The parse
  // path used to read `path` from inside a setState updater, but React 18
  // sometimes defers updater execution past the synchronous post-setState
  // code (eager-state-compute is skipped when the fiber already has
  // pending updates), which left the doc stuck on "parsing" because the
  // await never started. Reading from the ref avoids that race.
  const stateRef = useRef(state);
  stateRef.current = state;

  const parseById = useCallback(
    async (id: string, opts: { autoFlip?: boolean } = {}) => {
      const autoFlip = opts.autoFlip !== false;
      const doc = stateRef.current.documents.find((d) => d.id === id);
      if (!doc) return;
      if (doc.loading !== "unparsed" && doc.loading !== "error") return;
      const path = doc.file.path;
      if (autoFlip) autoFlipPending.current.add(id);

      // Pure updater — re-checks the lifecycle in case another tick beat
      // us to it. Parsing is also a "I'm keeping this" signal, so the
      // doc leaves the preview/temp slot here.
      setState((s) => {
        const d = s.documents.find((x) => x.id === id);
        if (!d) return s;
        if (d.loading !== "unparsed" && d.loading !== "error") return s;
        const next = updateDocById(s, id, { loading: "parsing", error: null });
        return s.tempId === id ? { ...next, tempId: null } : next;
      });

      try {
        const parsed = await chunkerClient.parseDocument(path);
        // Scanned PDFs (no text layer) skip the chunking pipeline entirely
        // and land in "ready"; the viewer renders an unsupported-format
        // empty state instead of an empty parsed pane.
        if (parsed.unsupportedReason) {
          autoFlipPending.current.delete(id);
          setState((s) => updateDocById(s, id, { parsed, loading: "ready" }));
        } else {
          setState((s) => updateDocById(s, id, { parsed, loading: "chunking" }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        autoFlipPending.current.delete(id);
        console.error("[parsing] failed", path, err);
        setState((s) =>
          updateDocById(s, id, { loading: "error", error: message }),
        );
      }
    },
    [autoFlipPending, setState],
  );

  const addFiles = useCallback(
    (files: OpenedFile[]) => {
      setState((s) => appendFresh(s, files));
    },
    [setState],
  );

  const parseDocument = useCallback(
    (id: string) => {
      void parseById(id);
    },
    [parseById],
  );

  // IDE-style preview tabs. Single-clicking a folder entry opens it as
  // a temp tab (italic); a subsequent click on a different entry replaces
  // that temp slot instead of stacking. Double-click — or any user
  // interaction (parse, ingest) — promotes to permanent. The pure
  // updater lives in `helpers.applyLoadEntry`.
  const loadEntry = useCallback(
    (entry: FolderEntry, opts: { permanent?: boolean } = {}) => {
      setState((s) => applyLoadEntry(s, entry, !!opts.permanent));
    },
    [setState],
  );

  const parseAllEntries = useCallback(() => {
    const entries = state.folder?.entries;
    if (!entries || entries.length === 0) return;

    // Single setState that adds missing docs AND collects every doc id
    // that needs parsing — both freshly added and pre-existing-unparsed.
    // parseById's own setState updaters see the new docs in state.
    const idsToParse: string[] = [];
    setState((s) => {
      const byPath = new Map(s.documents.map((d) => [d.file.path, d]));
      const fresh: DocumentEntry[] = [];
      for (const entry of entries) {
        const existing = byPath.get(entry.path);
        if (existing) {
          if (existing.loading === "unparsed" || existing.loading === "error") {
            idsToParse.push(existing.id);
          }
          continue;
        }
        const file = asOpenedFile(entry);
        const doc = { ...makeDocFromFile(file), id: newId() };
        idsToParse.push(doc.id);
        fresh.push(doc);
      }
      if (fresh.length === 0) return s;
      return {
        ...s,
        documents: [...s.documents, ...fresh],
        activeId: s.activeId ?? fresh[0].id,
      };
    });

    // autoFlip: false because batch-parsing many docs at once shouldn't
    // hijack the active tab's view to whichever finishes first.
    for (const id of idsToParse) {
      void parseById(id, { autoFlip: false });
    }
  }, [parseById, setState, state.folder]);

  return { parseById, addFiles, parseDocument, loadEntry, parseAllEntries };
}

function appendFresh(
  s: ChunkerSessionState,
  files: OpenedFile[],
): ChunkerSessionState {
  const existing = new Set(s.documents.map((d) => d.file.path));
  const fresh: DocumentEntry[] = [];
  for (const file of files) {
    if (existing.has(file.path)) continue;
    existing.add(file.path);
    fresh.push(makeDocFromFile(file));
  }
  if (fresh.length === 0) return s;
  return {
    ...s,
    documents: [...s.documents, ...fresh],
    activeId: s.activeId ?? fresh[0].id,
  };
}
