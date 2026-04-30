import { contextBridge, ipcRenderer } from "electron";
import type {
  AppConfig,
  ChunkSettings,
  ChunkingResult,
  ConnectionTestResult,
  FolderEntry,
  FolderSelection,
  IngestProgress,
  IngestStartRequest,
  IngestSummary,
  IpcResult,
  ManualBoundaryEditRequest,
  OllamaModel,
  OpenedFile,
  ParsedDocument,
} from "../shared/types";

const INGEST_PROGRESS_CHANNEL = "ingest:progress";

const api = {
  pickFiles: (options: { multi?: boolean } = {}): Promise<IpcResult<OpenedFile[]>> =>
    ipcRenderer.invoke("file:pick", options),
  parseDocument: (filePath: string): Promise<IpcResult<ParsedDocument>> =>
    ipcRenderer.invoke("document:parse", filePath),
  chunk: (
    text: string,
    settings: ChunkSettings,
  ): Promise<IpcResult<ChunkingResult>> =>
    ipcRenderer.invoke("chunk:run", text, settings),
  countTokens: (texts: string[]): Promise<IpcResult<number[]>> =>
    ipcRenderer.invoke("tokens:count", texts),
  saveManualBoundary: (
    request: ManualBoundaryEditRequest,
  ): Promise<IpcResult<true>> =>
    ipcRenderer.invoke("chunk:saveManualBoundary", request),
  pickFolder: (): Promise<IpcResult<FolderSelection | null>> =>
    ipcRenderer.invoke("folder:pick"),
  listFolder: (folderPath: string): Promise<IpcResult<FolderEntry[]>> =>
    ipcRenderer.invoke("folder:list", folderPath),
  readFile: (filePath: string): Promise<IpcResult<Uint8Array>> =>
    ipcRenderer.invoke("file:read", filePath),

  readConfig: (): Promise<IpcResult<AppConfig>> => ipcRenderer.invoke("config:read"),
  writeConfig: (next: AppConfig): Promise<IpcResult<AppConfig>> =>
    ipcRenderer.invoke("config:write", next),
  testDatabase: (databaseUrl: string): Promise<IpcResult<ConnectionTestResult>> =>
    ipcRenderer.invoke("db:test", databaseUrl),
  listOllamaModels: (baseUrl: string | null): Promise<IpcResult<OllamaModel[]>> =>
    ipcRenderer.invoke("ollama:list-models", baseUrl),
  probeOllamaModel: (
    baseUrl: string | null,
    model: string,
  ): Promise<IpcResult<{ dimensions: number }>> =>
    ipcRenderer.invoke("ollama:probe-model", baseUrl, model),

  ingest: (request: IngestStartRequest): Promise<IpcResult<IngestSummary>> =>
    ipcRenderer.invoke("ingest:run", request),
  /**
   * Subscribe to ingest progress events. Returns an unsubscribe
   * function so the renderer can detach when its component unmounts.
   */
  onIngestProgress: (handler: (progress: IngestProgress) => void): (() => void) => {
    const listener = (_e: unknown, payload: IngestProgress) => handler(payload);
    ipcRenderer.on(INGEST_PROGRESS_CHANNEL, listener);
    return () => ipcRenderer.removeListener(INGEST_PROGRESS_CHANNEL, listener);
  },
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("chunker", api);
} else {
  // @ts-expect-error fallback for non-isolated contexts
  window.chunker = api;
}

export type ChunkerApi = typeof api;
