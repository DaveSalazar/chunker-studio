import type {
  AppConfig,
  ChunkSettings,
  ChunkingResult,
  ConnectionTestResult,
  ExportRequest,
  ExportResult,
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
} from "@shared/types";

export interface ChunkerApi {
  pickFiles: (options?: { multi?: boolean }) => Promise<IpcResult<OpenedFile[]>>;
  parseDocument: (filePath: string) => Promise<IpcResult<ParsedDocument>>;
  chunk: (text: string, settings: ChunkSettings) => Promise<IpcResult<ChunkingResult>>;
  countTokens: (texts: string[]) => Promise<IpcResult<number[]>>;
  saveManualBoundary: (request: ManualBoundaryEditRequest) => Promise<IpcResult<true>>;
  pickFolder: () => Promise<IpcResult<FolderSelection | null>>;
  listFolder: (folderPath: string) => Promise<IpcResult<FolderEntry[]>>;
  readFile: (filePath: string) => Promise<IpcResult<Uint8Array>>;

  readConfig: () => Promise<IpcResult<AppConfig>>;
  writeConfig: (next: AppConfig) => Promise<IpcResult<AppConfig>>;
  testDatabase: (databaseUrl: string) => Promise<IpcResult<ConnectionTestResult>>;
  listOllamaModels: (baseUrl: string | null) => Promise<IpcResult<OllamaModel[]>>;
  probeOllamaModel: (
    baseUrl: string | null,
    model: string,
  ) => Promise<IpcResult<{ dimensions: number }>>;

  ingest: (request: IngestStartRequest) => Promise<IpcResult<IngestSummary>>;
  onIngestProgress: (handler: (progress: IngestProgress) => void) => () => void;
  exportChunks: (request: ExportRequest) => Promise<IpcResult<ExportResult>>;
}

declare global {
  interface Window {
    chunker: ChunkerApi;
  }
}
