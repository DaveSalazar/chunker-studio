import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_CHUNK_SETTINGS } from "@shared/types";
import { chunkerClient } from "@/services/chunker-client";
import { useDebounced } from "./useDebounced";
import { readPersistedSession, useSessionPersistence } from "./useSessionPersistence";
import { updateDocById } from "./session/helpers";
import { useChunkBoundary } from "./session/useChunkBoundary";
import { useDerived } from "./session/useDerived";
import { useFolderFlow } from "./session/useFolderFlow";
import { useParseFlow } from "./session/useParseFlow";
import { useRechunkEffect } from "./session/useRechunkEffect";
import { useScopeMutators } from "./session/useScopeMutators";
import type { ChunkerSession, ChunkerSessionState } from "./session/types";

export type {
  ChunkerSession,
  ChunkerSessionState,
  DocumentEntry,
  DocumentLoading,
  DocumentView,
  FolderState,
  SettingsScope,
} from "./session/types";

const INITIAL_STATE: ChunkerSessionState = {
  documents: [],
  activeId: null,
  globalSettings: DEFAULT_CHUNK_SETTINGS,
  scope: "global",
  folder: null,
  tempId: null,
};

export function useChunkerSession(): ChunkerSession {
  const [state, setState] = useState<ChunkerSessionState>(
    () => readPersistedSession() ?? INITIAL_STATE,
  );
  useSessionPersistence(state);

  const debouncedGlobal = useDebounced(state.globalSettings, 200);
  const debouncedDocs = useDebounced(state.documents, 200);
  const debouncedScope = useDebounced(state.scope, 200);

  const lastChunked = useRef<Map<string, string>>(new Map());
  const autoFlipPending = useRef<Set<string>>(new Set());
  const restoredOnce = useRef(false);

  const parseFlow = useParseFlow({ state, setState, autoFlipPending });
  const folderFlow = useFolderFlow({ state, setState });
  const setChunkBoundary = useChunkBoundary(setState);
  const scopeMutators = useScopeMutators(setState);
  const derived = useDerived(state);

  useRechunkEffect({
    documents: debouncedDocs,
    globalSettings: debouncedGlobal,
    scope: debouncedScope,
    setState,
    lastChunked,
    autoFlipPending,
  });

  // On first mount, replay parsing for any documents restored from
  // localStorage. Each call hits the SQLite parse cache (and then the
  // chunk cache via the rechunk effect), so this is near-instant.
  useEffect(() => {
    if (restoredOnce.current) return;
    restoredOnce.current = true;
    const ids = state.documents
      .filter((d) => d.loading === "unparsed" && !d.parsed)
      .map((d) => d.id);
    for (const id of ids) {
      void parseFlow.parseById(id, { autoFlip: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openFiles = useCallback(async () => {
    try {
      const files = await chunkerClient.pickFiles({ multi: true });
      if (files.length === 0) return;
      parseFlow.addFiles(files);
    } catch (err) {
      console.error("openFiles failed", err);
    }
  }, [parseFlow]);

  const closeDocument = useCallback((id: string) => {
    setState((s) => {
      const docs = s.documents.filter((d) => d.id !== id);
      const activeId = s.activeId === id ? (docs[0]?.id ?? null) : s.activeId;
      const tempId = s.tempId === id ? null : s.tempId;
      return { ...s, documents: docs, activeId, tempId };
    });
    lastChunked.current.delete(id);
    autoFlipPending.current.delete(id);
  }, []);

  const promoteTemp = useCallback((id: string) => {
    setState((s) => (s.tempId === id ? { ...s, tempId: null } : s));
  }, []);

  const resetToAuto = useCallback((id: string) => {
    setState((s) => updateDocById(s, id, { manualMode: false }));
    // Clear the cached chunk signature so the re-chunk effect re-runs.
    lastChunked.current.delete(id);
  }, []);

  const reset = useCallback(() => {
    lastChunked.current.clear();
    autoFlipPending.current.clear();
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    ...derived,
    hasOverride: !!derived.active?.overrides,
    ...scopeMutators,
    openFiles,
    closeDocument,
    selectFolder: folderFlow.selectFolder,
    refreshFolder: folderFlow.refreshFolder,
    closeFolder: folderFlow.closeFolder,
    loadEntry: parseFlow.loadEntry,
    parseAllEntries: parseFlow.parseAllEntries,
    parseDocument: parseFlow.parseDocument,
    promoteTemp,
    setChunkBoundary,
    resetToAuto,
    reset,
  };
}
