export interface OpenedFile {
  path: string;
  name: string;
  size: number;
  modifiedAt: number;
  extension: string;
}

export interface FolderSelection {
  path: string;
  name: string;
}

export interface FolderEntry {
  path: string;
  name: string;
  relativePath: string;
  size: number;
  modifiedAt: number;
  extension: string;
}
