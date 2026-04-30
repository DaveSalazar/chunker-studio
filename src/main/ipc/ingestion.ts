import { BrowserWindow, ipcMain } from "electron";
import { AppContainer, IngestionLocator } from "../core";
import { IngestDocumentUseCase } from "../core/ingestion/application/IngestDocumentUseCase";
import type {
  IngestStartRequest,
  IngestSummary,
  IpcResult,
} from "../../shared/types";
import { wrap } from "./wrap";

export const INGEST_PROGRESS_CHANNEL = "ingest:progress";

export function registerIngestionHandlers(): void {
  ipcMain.handle(
    "ingest:run",
    async (
      event,
      request: IngestStartRequest,
    ): Promise<IpcResult<IngestSummary>> =>
      wrap(() => {
        const useCase = AppContainer.get<IngestDocumentUseCase>(
          IngestionLocator.IngestDocumentUseCase,
        );
        // Push progress events back to the originating renderer.
        // Falls back to broadcasting to all windows if the sender is
        // gone (e.g. window closed mid-job — rare but possible).
        const sender = BrowserWindow.fromWebContents(event.sender);
        const send = (payload: unknown) => {
          if (sender && !sender.isDestroyed()) {
            sender.webContents.send(INGEST_PROGRESS_CHANNEL, payload);
          } else {
            for (const w of BrowserWindow.getAllWindows()) {
              if (!w.isDestroyed()) w.webContents.send(INGEST_PROGRESS_CHANNEL, payload);
            }
          }
        };
        return useCase.execute(request, send);
      }),
  );
}
