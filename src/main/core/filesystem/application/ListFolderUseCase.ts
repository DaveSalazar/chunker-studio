import { inject, injectable } from "inversify";
import { FileSystemLocator } from "../domain/FileSystemLocator";
import type { FileSystemRepository } from "../domain/FileSystemRepository";
import type { FolderEntry } from "../domain/FileSystemEntities";

@injectable()
export class ListFolderUseCase {
  constructor(
    @inject(FileSystemLocator.FileSystemRepository)
    private readonly fs: FileSystemRepository,
  ) {}

  execute(folderPath: string): Promise<FolderEntry[]> {
    return this.fs.listSupported(folderPath);
  }
}
