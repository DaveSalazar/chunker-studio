import { inject, injectable } from "inversify";
import { FileSystemLocator } from "../domain/FileSystemLocator";
import type { FileSystemRepository } from "../domain/FileSystemRepository";

@injectable()
export class ReadFileBytesUseCase {
  constructor(
    @inject(FileSystemLocator.FileSystemRepository)
    private readonly fs: FileSystemRepository,
  ) {}

  execute(path: string): Promise<Uint8Array> {
    return this.fs.readBytes(path);
  }
}
