import { ipcMain } from "electron";
import { AppContainer, SessionLocator } from "../core";
import { GetSessionCacheStatsUseCase } from "../core/session/application/GetSessionCacheStatsUseCase";
import { ClearSessionCacheUseCase } from "../core/session/application/ClearSessionCacheUseCase";
import type { IpcResult, SessionCacheStats } from "../../shared/types";
import { wrap } from "./wrap";

export function registerCacheHandlers(): void {
  ipcMain.handle(
    "cache:stats",
    async (): Promise<IpcResult<SessionCacheStats>> =>
      wrap(() =>
        AppContainer.get<GetSessionCacheStatsUseCase>(
          SessionLocator.GetSessionCacheStatsUseCase,
        ).execute(),
      ),
  );

  ipcMain.handle("cache:clear", async (): Promise<IpcResult<true>> =>
    wrap(async () => {
      await AppContainer.get<ClearSessionCacheUseCase>(
        SessionLocator.ClearSessionCacheUseCase,
      ).execute();
      return true as const;
    }),
  );
}
