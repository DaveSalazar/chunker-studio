import { inject, injectable } from "inversify";
import { FileSystemLocator } from "../domain/FileSystemLocator";
import type { FileSystemRepository } from "../domain/FileSystemRepository";
import type { FileMetadata } from "../domain/FileSystemEntities";

@injectable()
export class OpenFileDialogUseCase {
  constructor(
    @inject(FileSystemLocator.FileSystemRepository)
    private readonly fs: FileSystemRepository,
  ) {}

  /**
   * @param multi when true, dialog allows selecting many files at once.
   *              Single mode still returns an array (length 0 = cancelled,
   *              length 1 = picked), so callers don't have to special-case.
   */
  execute(options: { multi?: boolean } = {}): Promise<FileMetadata[]> {
    return this.fs.pickFiles(options);
  }
}
