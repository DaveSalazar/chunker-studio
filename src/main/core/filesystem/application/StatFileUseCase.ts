import { inject, injectable } from "inversify";
import { FileSystemLocator } from "../domain/FileSystemLocator";
import type { FileSystemRepository } from "../domain/FileSystemRepository";
import type { FileMetadata } from "../domain/FileSystemEntities";

@injectable()
export class StatFileUseCase {
  constructor(
    @inject(FileSystemLocator.FileSystemRepository)
    private readonly fs: FileSystemRepository,
  ) {}

  execute(path: string): Promise<FileMetadata> {
    return this.fs.stat(path);
  }
}
