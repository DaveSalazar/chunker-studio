import { ipcMain } from "electron";
import { AppContainer, ConfigLocator } from "../core";
import { GetConfigUseCase } from "../core/config/application/GetConfigUseCase";
import { UpdateConfigUseCase } from "../core/config/application/UpdateConfigUseCase";
import type { AppConfig, IpcResult } from "../../shared/types";
import { wrap } from "./wrap";

export function registerConfigHandlers(): void {
  ipcMain.handle("config:read", async (): Promise<IpcResult<AppConfig>> =>
    wrap(() =>
      AppContainer.get<GetConfigUseCase>(ConfigLocator.GetConfigUseCase).execute(),
    ),
  );

  ipcMain.handle(
    "config:write",
    async (_event, next: AppConfig): Promise<IpcResult<AppConfig>> =>
      wrap(() =>
        AppContainer.get<UpdateConfigUseCase>(ConfigLocator.UpdateConfigUseCase).execute(
          next,
        ),
      ),
  );
}
