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
  ManualBoundaryEditRequest,
  OllamaModel,
  OpenedFile,
  ParsedDocument,
} from "@shared/types";

class ChunkerError extends Error {}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ChunkerError(result.error);
  return result.value;
}

/**
 * Renderer-side facade over the preload bridge.
 *
 * Each call already runs through `wrap()` in main, so we get a serializable
 * envelope back. This module turns failures into thrown `ChunkerError`s so
 * callers can use plain await + try/catch.
 */
export const chunkerClient = {
  async pickFiles(options: { multi?: boolean } = {}): Promise<OpenedFile[]> {
    return unwrap(await window.chunker.pickFiles(options));
  },
  async parseDocument(filePath: string): Promise<ParsedDocument> {
    return unwrap(await window.chunker.parseDocument(filePath));
  },
  async chunk(text: string, settings: ChunkSettings): Promise<ChunkingResult> {
    return unwrap(await window.chunker.chunk(text, settings));
  },
  async countTokens(texts: string[]): Promise<number[]> {
    return unwrap(await window.chunker.countTokens(texts));
  },
  async saveManualBoundary(request: ManualBoundaryEditRequest): Promise<void> {
    unwrap(await window.chunker.saveManualBoundary(request));
  },
  async pickFolder(): Promise<FolderSelection | null> {
    return unwrap(await window.chunker.pickFolder());
  },
  async listFolder(folderPath: string): Promise<FolderEntry[]> {
    return unwrap(await window.chunker.listFolder(folderPath));
  },
  async readFile(filePath: string): Promise<Uint8Array> {
    return unwrap(await window.chunker.readFile(filePath));
  },
  async readConfig(): Promise<AppConfig> {
    return unwrap(await window.chunker.readConfig());
  },
  async writeConfig(next: AppConfig): Promise<AppConfig> {
    return unwrap(await window.chunker.writeConfig(next));
  },
  async testDatabase(databaseUrl: string): Promise<ConnectionTestResult> {
    return unwrap(await window.chunker.testDatabase(databaseUrl));
  },
  async listOllamaModels(baseUrl: string | null): Promise<OllamaModel[]> {
    return unwrap(await window.chunker.listOllamaModels(baseUrl));
  },
  async probeOllamaModel(
    baseUrl: string | null,
    model: string,
  ): Promise<{ dimensions: number }> {
    return unwrap(await window.chunker.probeOllamaModel(baseUrl, model));
  },
  async ingest(request: IngestStartRequest): Promise<IngestSummary> {
    return unwrap(await window.chunker.ingest(request));
  },
  onIngestProgress(handler: (progress: IngestProgress) => void): () => void {
    return window.chunker.onIngestProgress(handler);
  },
  async exportChunks(request: ExportRequest): Promise<ExportResult> {
    return unwrap(await window.chunker.exportChunks(request));
  },
};

export { ChunkerError };
