import { ipcMain } from "electron";
import { AppContainer, FileSystemLocator } from "../core";
import { OpenFileDialogUseCase } from "../core/filesystem/application/OpenFileDialogUseCase";
import { PickFolderUseCase } from "../core/filesystem/application/PickFolderUseCase";
import { ListFolderUseCase } from "../core/filesystem/application/ListFolderUseCase";
import type { FileSystemRepository } from "../core/filesystem/domain/FileSystemRepository";
import type {
  FolderEntry,
  FolderSelection,
  IpcResult,
  OpenedFile,
} from "../../shared/types";
import { wrap } from "./wrap";

export function registerFilesystemHandlers(): void {
  ipcMain.handle(
    "file:pick",
    async (
      _event,
      options: { multi?: boolean } = {},
    ): Promise<IpcResult<OpenedFile[]>> => {
      return wrap(async () => {
        const useCase = AppContainer.get<OpenFileDialogUseCase>(
          FileSystemLocator.OpenFileDialogUseCase,
        );
        const metas = await useCase.execute(options);
        return metas.map((meta) => ({
          path: meta.path,
          name: meta.name,
          size: meta.size,
          modifiedAt: meta.modifiedAt,
          extension: meta.extension,
        }));
      });
    },
  );

  ipcMain.handle(
    "folder:pick",
    async (): Promise<IpcResult<FolderSelection | null>> =>
      wrap(async () => {
        const useCase = AppContainer.get<PickFolderUseCase>(
          FileSystemLocator.PickFolderUseCase,
        );
        return useCase.execute();
      }),
  );

  ipcMain.handle(
    "folder:list",
    async (_event, folderPath: string): Promise<IpcResult<FolderEntry[]>> =>
      wrap(async () => {
        const useCase = AppContainer.get<ListFolderUseCase>(
          FileSystemLocator.ListFolderUseCase,
        );
        return useCase.execute(folderPath);
      }),
  );

  ipcMain.handle(
    "file:read",
    async (_event, filePath: string): Promise<IpcResult<Uint8Array>> =>
      wrap(async () => {
        const repo = AppContainer.get<FileSystemRepository>(
          FileSystemLocator.FileSystemRepository,
        );
        return repo.readBytes(filePath);
      }),
  );
}
