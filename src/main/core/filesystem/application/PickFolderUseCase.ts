import { inject, injectable } from "inversify";
import { FileSystemLocator } from "../domain/FileSystemLocator";
import type { FileSystemRepository } from "../domain/FileSystemRepository";
import type { FolderSelection } from "../domain/FileSystemEntities";

@injectable()
export class PickFolderUseCase {
  constructor(
    @inject(FileSystemLocator.FileSystemRepository)
    private readonly fs: FileSystemRepository,
  ) {}

  execute(): Promise<FolderSelection | null> {
    return this.fs.pickFolder();
  }
}
