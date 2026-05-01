import type {
  ChunkSettings,
  ChunkingResult,
  FolderEntry,
  FolderSelection,
  OpenedFile,
  ParsedDocument,
} from "@shared/types";

export type SettingsScope = "global" | "perDocument";

export type DocumentLoading =
  | "unparsed"
  | "parsing"
  | "chunking"
  | "ready"
  | "error";

export type DocumentView = "raw" | "parsed";

export interface DocumentEntry {
  id: string;
  file: OpenedFile;
  parsed: ParsedDocument | null;
  result: ChunkingResult | null;
  /** When non-null and scope is perDocument, replaces the global settings for this doc. */
  overrides: ChunkSettings | null;
  loading: DocumentLoading;
  error: string | null;
  /** Which view the document is currently rendered in. */
  view: DocumentView;
  /**
   * True once the user has manually edited a chunk boundary. Sliders no
   * longer touch the chunks for this doc until `resetToAuto` is called.
   */
  manualMode: boolean;
  /**
   * Current page in the PDF preview (1-indexed). Tracked per-doc so
   * switching tabs preserves scroll position, and so clicking a chunk
   * can navigate the PDF to its corresponding page.
   */
  pdfPage: number;
}

export interface FolderState {
  selection: FolderSelection;
  entries: FolderEntry[];
  loading: "idle" | "listing";
  error: string | null;
}

export interface ChunkerSessionState {
  documents: DocumentEntry[];
  activeId: string | null;
  globalSettings: ChunkSettings;
  scope: SettingsScope;
  folder: FolderState | null;
  /**
   * IDE-style preview tab. Single-clicking a folder entry creates a tab
   * here; clicking another entry replaces it instead of stacking. Cleared
   * (promoted to permanent) on double-click, parse, or ingest start.
   */
  tempId: string | null;
}

export interface ChunkerSession extends ChunkerSessionState {
  active: DocumentEntry | null;
  /** Settings the active document is currently rendered with (override or global). */
  effectiveSettings: ChunkSettings;
  hasOverride: boolean;
  /** Aggregate counts across every document. */
  totals: { documents: number; chunks: number; tokens: number; usd: number };
  /** Set of document paths currently loaded — folder UI uses it to mark entries. */
  loadedPaths: ReadonlySet<string>;
  /** Set of document paths whose parsing has completed — folder UI uses it for the green check. */
  parsedPaths: ReadonlySet<string>;

  openFiles: () => Promise<void>;
  closeDocument: (id: string) => void;
  setActive: (id: string) => void;
  setScope: (next: SettingsScope) => void;
  setSettings: (next: ChunkSettings) => void;
  /** Reset the active doc back to the global settings (only meaningful in perDocument mode). */
  clearOverride: () => void;
  /** Open the folder-picker dialog, list it, and store as the active folder. */
  selectFolder: () => Promise<void>;
  /** Refresh the file listing of the currently selected folder. */
  refreshFolder: () => Promise<void>;
  closeFolder: () => void;
  /**
   * Load a single folder entry as a document and activate its tab. By
   * default the new tab is opened as a temp/preview tab (replaces the
   * existing temp slot if any). Pass `{ permanent: true }` from a
   * double-click to skip the preview state.
   */
  loadEntry: (entry: FolderEntry, opts?: { permanent?: boolean }) => void;
  /** Promote the given doc to a permanent tab. No-op if it is not the temp tab. */
  promoteTemp: (id: string) => void;
  /**
   * Load every folder entry that isn't already a document, then trigger
   * parse on each entry that's still unparsed. Single-shot ingest pipeline.
   */
  parseAllEntries: () => void;
  /** Kick off parsing for a doc that's still in "unparsed" or "error". */
  parseDocument: (id: string) => void;
  /** Switch a document between the original (raw) view and the parsed/chunked view. */
  setDocumentView: (id: string, view: DocumentView) => void;
  /** Move the PDF preview to a specific page (1-indexed). Per-doc. */
  setPdfPage: (id: string, page: number) => void;
  /**
   * Move the boundary between two adjacent chunks. `chunkIndex` is the
   * left chunk's index; the right chunk is the next non-null sibling.
   * Flips the doc into manualMode the first time it's called.
   */
  setChunkBoundary: (id: string, chunkIndex: number, newOffset: number) => void;
  /** Drop manualMode for a doc and re-run the chunker against the active settings. */
  resetToAuto: (id: string) => void;
  reset: () => void;
}
