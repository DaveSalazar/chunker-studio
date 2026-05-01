import { registerFilesystemHandlers } from "./filesystem";
import { registerParsingHandlers } from "./parsing";
import { registerChunkingHandlers } from "./chunking";
import { registerConfigHandlers } from "./config";
import { registerIngestionHandlers } from "./ingestion";
import { registerDatabaseHandlers } from "./database";
import { registerOllamaHandlers } from "./ollama";
import { registerExportHandlers } from "./export";

export function registerAllHandlers(): void {
  registerFilesystemHandlers();
  registerParsingHandlers();
  registerChunkingHandlers();
  registerConfigHandlers();
  registerIngestionHandlers();
  registerDatabaseHandlers();
  registerOllamaHandlers();
  registerExportHandlers();
}
