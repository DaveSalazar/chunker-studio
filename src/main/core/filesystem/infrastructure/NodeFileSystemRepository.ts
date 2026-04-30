import { dialog } from "electron";
import { promises as fs } from "fs";
import { basename, extname, join, relative } from "path";
import { injectable } from "inversify";
import type { FileSystemRepository } from "../domain/FileSystemRepository";
import {
  type FileMetadata,
  type FolderEntry,
  type FolderSelection,
  IGNORED_DIRECTORIES,
  isSupportedExtension,
  SUPPORTED_EXTENSIONS,
} from "../domain/FileSystemEntities";

@injectable()
export class NodeFileSystemRepository implements FileSystemRepository {
  async pickFiles(options: { multi?: boolean } = {}): Promise<FileMetadata[]> {
    const properties: ("openFile" | "multiSelections")[] = ["openFile"];
    if (options.multi) properties.push("multiSelections");
    const result = await dialog.showOpenDialog({
      title: options.multi ? "Open documents" : "Open document",
      properties,
      filters: [{ name: "Documents", extensions: [...SUPPORTED_EXTENSIONS] }],
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return Promise.all(result.filePaths.map((p) => this.stat(p)));
  }

  async pickFolder(): Promise<FolderSelection | null> {
    const result = await dialog.showOpenDialog({
      title: "Choose folder",
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const path = result.filePaths[0];
    return { path, name: basename(path) };
  }

  async listSupported(folderPath: string): Promise<FolderEntry[]> {
    // Bounded depth keeps a misclick on `/` from spending an hour
    // walking the disk. 12 covers any reasonable corpus tree.
    const out: FolderEntry[] = [];
    await this.walk(folderPath, folderPath, out, 0, 12);
    out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return out;
  }

  private async walk(
    root: string,
    current: string,
    out: FolderEntry[],
    depth: number,
    maxDepth: number,
  ): Promise<void> {
    if (depth > maxDepth) return;
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return; // permission errors etc. — skip silently
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        await this.walk(root, full, out, depth + 1, maxDepth);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase().replace(/^\./, "");
      if (!isSupportedExtension(ext)) continue;
      let st: import("fs").Stats;
      try {
        st = await fs.stat(full);
      } catch {
        continue;
      }
      out.push({
        path: full,
        name: entry.name,
        relativePath: relative(root, full),
        size: st.size,
        modifiedAt: st.mtimeMs,
        extension: ext,
      });
    }
  }

  async stat(path: string): Promise<FileMetadata> {
    const st = await fs.stat(path);
    return {
      path,
      name: basename(path),
      size: st.size,
      modifiedAt: st.mtimeMs,
      extension: extname(path).toLowerCase().replace(/^\./, ""),
    };
  }

  async readBytes(path: string): Promise<Uint8Array> {
    const buf = await fs.readFile(path);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  async readUtf8(path: string): Promise<string> {
    return fs.readFile(path, "utf-8");
  }
}
