import { useEffect, useRef } from "react";
import { DEFAULT_CHUNK_SETTINGS, type ChunkSettings, type OpenedFile } from "@shared/types";
import type {
  ChunkerSessionState,
  DocumentEntry,
  DocumentView,
  FolderState,
  SettingsScope,
} from "./useChunkerSession";

const STORAGE_KEY = "chunker.session.v1";
const WRITE_DEBOUNCE_MS = 400;

interface PersistedDoc {
  id: string;
  file: OpenedFile;
  overrides: ChunkSettings | null;
  manualMode: boolean;
  view: DocumentView;
}

interface PersistedSession {
  version: 1;
  documents: PersistedDoc[];
  activeId: string | null;
  globalSettings: ChunkSettings;
  scope: SettingsScope;
  folder: FolderState | null;
}

export function readPersistedSession(): ChunkerSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (parsed.version !== 1) return null;
    const documents = sanitizeDocs(parsed.documents);
    return {
      documents,
      activeId: pickActiveId(parsed.activeId, documents),
      globalSettings: { ...DEFAULT_CHUNK_SETTINGS, ...(parsed.globalSettings ?? {}) },
      scope: parsed.scope === "perDocument" ? "perDocument" : "global",
      folder: parsed.folder ?? null,
      // Temp/preview tabs are session-scoped — every restored doc is treated
      // as permanent so a stale italic tab can't re-appear on reload.
      tempId: null,
    };
  } catch {
    return null;
  }
}

/**
 * Persist the session shape (doc pointers, settings, folder) to localStorage.
 * Heavy fields — parsed text and chunk results — live in SQLite and get
 * rehydrated by replaying the IPC calls, so we don't store them here.
 */
export function useSessionPersistence(state: ChunkerSessionState): void {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      try {
        const blob: PersistedSession = {
          version: 1,
          documents: state.documents.map((d) => ({
            id: d.id,
            file: d.file,
            overrides: d.overrides,
            manualMode: d.manualMode,
            view: d.view,
          })),
          activeId: state.activeId,
          globalSettings: state.globalSettings,
          scope: state.scope,
          folder: state.folder,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
      } catch {
        // Swallow quota / serialization errors — session restore is a
        // convenience, not a correctness boundary.
      }
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [state]);
}

function sanitizeDocs(input: PersistedDoc[] | undefined): DocumentEntry[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((d): d is PersistedDoc => !!d && typeof d?.id === "string" && !!d.file?.path)
    .map((d) => ({
      id: d.id,
      file: d.file,
      parsed: null,
      result: null,
      overrides: d.overrides ?? null,
      loading: "unparsed",
      error: null,
      view: d.view === "parsed" ? "parsed" : "raw",
      manualMode: !!d.manualMode,
    }));
}

function pickActiveId(candidate: string | null | undefined, docs: DocumentEntry[]): string | null {
  if (candidate && docs.some((d) => d.id === candidate)) return candidate;
  return docs[0]?.id ?? null;
}
