import { ipcMain } from "electron";
import { AppContainer, CorpusLocator } from "../core";
import { TestConnectionUseCase } from "../core/corpus/application/TestConnectionUseCase";
import type { ConnectionTestResult, IpcResult } from "../../shared/types";
import { wrap } from "./wrap";

export function registerDatabaseHandlers(): void {
  ipcMain.handle(
    "db:test",
    async (
      _event,
      databaseUrl: string,
    ): Promise<IpcResult<ConnectionTestResult>> =>
      wrap(() =>
        AppContainer.get<TestConnectionUseCase>(
          CorpusLocator.TestConnectionUseCase,
        ).execute(databaseUrl),
      ),
  );
}
