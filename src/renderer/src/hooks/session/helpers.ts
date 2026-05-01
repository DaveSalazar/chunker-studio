import type { ChunkSettings, FolderEntry, OpenedFile } from "@shared/types";
import type {
  ChunkerSessionState,
  DocumentEntry,
  SettingsScope,
} from "./types";

export function effectiveSettingsFor(
  doc: DocumentEntry,
  scope: SettingsScope,
  global: ChunkSettings,
): ChunkSettings {
  if (scope === "perDocument" && doc.overrides) return doc.overrides;
  return global;
}

export function settingsKey(s: ChunkSettings): string {
  return JSON.stringify(s);
}

let __id = 0;
export const newId = (): string =>
  `doc-${Date.now().toString(36)}-${(__id++).toString(36)}`;

export function asOpenedFile(entry: FolderEntry): OpenedFile {
  return {
    path: entry.path,
    name: entry.name,
    size: entry.size,
    modifiedAt: entry.modifiedAt,
    extension: entry.extension,
  };
}

export function updateDocById(
  state: ChunkerSessionState,
  id: string,
  patch: Partial<DocumentEntry>,
): ChunkerSessionState {
  return {
    ...state,
    documents: state.documents.map((d) =>
      d.id === id ? { ...d, ...patch } : d,
    ),
  };
}

export function makeDocFromFile(file: OpenedFile): DocumentEntry {
  return {
    id: newId(),
    file,
    parsed: null,
    result: null,
    overrides: null,
    loading: "unparsed",
    error: null,
    view: "raw",
    manualMode: false,
    pdfPage: 1,
  };
}

/**
 * Pure setState updater for IDE-style preview tab loading. Keeps temp-tab
 * replacement / activate-existing logic out of the hook body so the hook
 * stays focused on orchestration.
 */
export function applyLoadEntry(
  s: ChunkerSessionState,
  entry: FolderEntry,
  permanent: boolean,
): ChunkerSessionState {
  const existing = s.documents.find((d) => d.file.path === entry.path);
  if (existing) {
    const tempId = permanent && s.tempId === existing.id ? null : s.tempId;
    if (s.activeId === existing.id && tempId === s.tempId) return s;
    return { ...s, activeId: existing.id, tempId };
  }

  const newDoc = makeDocFromFile(asOpenedFile(entry));

  if (permanent || !s.tempId) {
    return {
      ...s,
      documents: [...s.documents, newDoc],
      activeId: newDoc.id,
      tempId: permanent ? s.tempId : newDoc.id,
    };
  }

  const tempIdx = s.documents.findIndex((d) => d.id === s.tempId);
  if (tempIdx < 0) {
    return {
      ...s,
      documents: [...s.documents, newDoc],
      activeId: newDoc.id,
      tempId: newDoc.id,
    };
  }
  const docs = s.documents.slice();
  docs[tempIdx] = newDoc;
  return { ...s, documents: docs, activeId: newDoc.id, tempId: newDoc.id };
}
