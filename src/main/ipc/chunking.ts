import { ipcMain } from "electron";
import { ChunkerWorkerPool } from "../services/ChunkerWorkerPool";
import { AppContainer, SessionLocator } from "../core";
import type { SessionRepository } from "../core/session/domain/SessionRepository";
import { hashSettings, hashText } from "../core/session/domain/hash";
import {
  PRICE_PER_M_TOKENS_USD,
  type ChunkRecord,
  type ChunkSettings,
  type ChunkingResult,
  type IpcResult,
  type ManualBoundaryEditRequest,
} from "../../shared/types";
import { wrap } from "./wrap";

let pool: ChunkerWorkerPool | null = null;
function getPool(): ChunkerWorkerPool {
  if (!pool) pool = new ChunkerWorkerPool();
  return pool;
}

export function registerChunkingHandlers(): void {
  ipcMain.handle(
    "chunk:run",
    async (
      _event,
      text: string,
      settings: ChunkSettings,
    ): Promise<IpcResult<ChunkingResult>> =>
      wrap(async () => {
        const sessions = AppContainer.get<SessionRepository>(SessionLocator.SessionRepository);
        const textHash = hashText(text);
        const settingsHash = hashSettings(settings);
        const cacheKey = { textHash, settingsHash };

        const cached = await sessions.getCachedChunking(textHash, settingsHash);
        if (cached) {
          return { ...cached.result, cacheKey };
        }

        const outcome = await getPool().chunk(text, settings);
        const cost = (outcome.totalTokens / 1_000_000) * PRICE_PER_M_TOKENS_USD;
        const result: ChunkingResult = {
          chunks: outcome.chunks.map((c) => ({
            index: c.index,
            article: c.article,
            heading: c.heading,
            text: c.text,
            charCount: c.charCount,
            tokenCount: c.tokenCount,
            startOffset: c.startOffset,
            endOffset: c.endOffset,
          })),
          totalTokens: outcome.totalTokens,
          totalChars: outcome.totalChars,
          strategy: outcome.strategy,
          normalizedText: outcome.normalizedText,
          estimatedCostUsd: cost,
        };
        await sessions.saveCachedChunking(textHash, settingsHash, settings, result);
        return { ...result, cacheKey };
      }),
  );

  ipcMain.handle(
    "tokens:count",
    async (_event, texts: string[]): Promise<IpcResult<number[]>> =>
      wrap(async () => getPool().countTokens(texts)),
  );

  ipcMain.handle(
    "chunk:saveManualBoundary",
    async (
      _event,
      request: ManualBoundaryEditRequest,
    ): Promise<IpcResult<true>> =>
      wrap(async () => {
        const sessions = AppContainer.get<SessionRepository>(SessionLocator.SessionRepository);
        await sessions.saveManualBoundaryEdit(
          request.cacheKey.textHash,
          request.cacheKey.settingsHash,
          request.leftIndex,
          stripChunk(request.left),
          stripChunk(request.right),
        );
        return true as const;
      }),
  );
}

function stripChunk(c: ChunkRecord): ChunkRecord {
  return {
    index: c.index,
    article: c.article,
    heading: c.heading,
    text: c.text,
    charCount: c.charCount,
    tokenCount: c.tokenCount,
    startOffset: c.startOffset,
    endOffset: c.endOffset,
  };
}
