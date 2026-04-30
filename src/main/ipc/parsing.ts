import { ipcMain } from "electron";
import { AppContainer, FileSystemLocator, SessionLocator } from "../core";
import { StatFileUseCase } from "../core/filesystem/application/StatFileUseCase";
import { ParserWorkerPool, type ParseKind } from "../services/ParserWorkerPool";
import { UnsupportedFormatError } from "../core/parsing/domain/ParsingEntities";
import type { FileSystemRepository } from "../core/filesystem/domain/FileSystemRepository";
import type { SessionRepository } from "../core/session/domain/SessionRepository";
import { hashBytes } from "../core/session/domain/hash";
import type { IpcResult, ParsedDocument } from "../../shared/types";
import { wrap } from "./wrap";

let pool: ParserWorkerPool | null = null;
function getPool(): ParserWorkerPool {
  if (!pool) pool = new ParserWorkerPool();
  return pool;
}

function pickKind(extension: string): ParseKind {
  const ext = extension.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "docx" || ext === "doc") return "docx";
  if (ext === "txt" || ext === "md") return "text";
  throw new UnsupportedFormatError(extension);
}

export function registerParsingHandlers(): void {
  ipcMain.handle(
    "document:parse",
    async (_event, filePath: string): Promise<IpcResult<ParsedDocument>> =>
      wrap(async () => {
        console.log("[parsing] document:parse start", filePath);
        const stat = AppContainer.get<StatFileUseCase>(FileSystemLocator.StatFileUseCase);
        const fs = AppContainer.get<FileSystemRepository>(
          FileSystemLocator.FileSystemRepository,
        );
        const sessions = AppContainer.get<SessionRepository>(SessionLocator.SessionRepository);
        const metadata = await stat.execute(filePath);
        const kind = pickKind(metadata.extension);
        console.log("[parsing] reading bytes, kind=", kind);
        const bytes = await fs.readBytes(filePath);
        const fileHash = hashBytes(bytes);

        const cached = await sessions.getCachedParse(fileHash);
        if (cached) {
          console.log("[parsing] cache hit", fileHash.slice(0, 8));
          // Refresh path/name in case the file moved between runs.
          return {
            ...cached.parsed,
            path: metadata.path,
            name: metadata.name,
            extension: metadata.extension,
          };
        }

        console.log("[parsing] cache miss; dispatching to worker, bytes=", bytes.length);
        const value = await getPool().parse(kind, bytes);
        console.log(
          "[parsing] worker replied, text length=", value.text.length,
          "unsupportedReason=", value.unsupportedReason ?? null,
        );
        const parsed: ParsedDocument = {
          path: metadata.path,
          name: metadata.name,
          extension: metadata.extension,
          text: value.text,
          pageCount: value.pageCount,
          warnings: value.warnings,
          ...(value.unsupportedReason ? { unsupportedReason: value.unsupportedReason } : {}),
        };
        await sessions.saveCachedParse(fileHash, parsed);
        return parsed;
      }),
  );
}
