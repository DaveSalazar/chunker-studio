import type { FileMetadata, FolderEntry, FolderSelection } from "./FileSystemEntities";

export interface FileSystemRepository {
  /** Returns 0+ files. Empty array means the user cancelled the dialog. */
  pickFiles(options?: { multi?: boolean }): Promise<FileMetadata[]>;

  /** Open a folder-picker dialog. Null when cancelled. */
  pickFolder(): Promise<FolderSelection | null>;

  /**
   * Recursively walk a folder, returning every supported document
   * (pdf/docx/doc/txt/md) as a flat list. Hidden files and directories
   * named in `IGNORED_DIRECTORIES` are skipped.
   */
  listSupported(folderPath: string): Promise<FolderEntry[]>;

  stat(path: string): Promise<FileMetadata>;
  readBytes(path: string): Promise<Uint8Array>;
  readUtf8(path: string): Promise<string>;
}
