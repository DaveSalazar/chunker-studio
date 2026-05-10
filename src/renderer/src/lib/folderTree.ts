// Build a nested folder tree from the flat FolderEntry[] the walker
// returns. Each entry's `relativePath` is split on the platform-agnostic
// separator and walked into the tree; intermediate folders are created
// on demand. Sorted folders-first then alpha within each level so the
// tree renders deterministically.

import type { FolderEntry } from "@shared/types";

export interface TreeFolder {
  /** Just this folder's segment, e.g. "Contratos". */
  name: string;
  /** Full path from the selection root, e.g. "Modelos/Contratos". Used as
   *  the stable key for the expand-state Set. */
  path: string;
  folders: TreeFolder[];
  files: FolderEntry[];
}

export function buildFolderTree(entries: readonly FolderEntry[]): TreeFolder {
  const root: TreeFolder = { name: "", path: "", folders: [], files: [] };
  for (const entry of entries) {
    const segments = splitPath(entry.relativePath);
    // The last segment is the file itself; everything before is folders.
    const folderSegments = segments.slice(0, -1);
    let cursor = root;
    for (const segment of folderSegments) {
      let child = cursor.folders.find((f) => f.name === segment);
      if (!child) {
        const childPath = cursor.path ? `${cursor.path}/${segment}` : segment;
        child = { name: segment, path: childPath, folders: [], files: [] };
        cursor.folders.push(child);
      }
      cursor = child;
    }
    cursor.files.push(entry);
  }
  sortRecursive(root);
  return root;
}

/** Collect the full set of folder paths in the tree — useful for
 *  auto-expanding when a search filter is active. */
export function collectFolderPaths(tree: TreeFolder): string[] {
  const out: string[] = [];
  walk(tree);
  return out;
  function walk(node: TreeFolder): void {
    for (const child of node.folders) {
      out.push(child.path);
      walk(child);
    }
  }
}

/** All file paths reachable under `folder` (including descendants). The
 *  Select-to-Index UI uses this to toggle a whole subtree at once. */
export function collectDescendantFilePaths(folder: TreeFolder): string[] {
  const out: string[] = [];
  walk(folder);
  return out;
  function walk(node: TreeFolder): void {
    for (const f of node.files) out.push(f.path);
    for (const child of node.folders) walk(child);
  }
}

export type FolderCheckState = "checked" | "unchecked" | "indeterminate";

/** Tri-state for a folder's checkbox, derived from descendant file
 *  paths against the unchecked set. Empty folders count as `checked`
 *  so toggling them still flips the visible state predictably. */
export function folderCheckState(
  folder: TreeFolder,
  unchecked: ReadonlySet<string>,
): FolderCheckState {
  const paths = collectDescendantFilePaths(folder);
  if (paths.length === 0) return "checked";
  let uncheckedCount = 0;
  for (const p of paths) if (unchecked.has(p)) uncheckedCount++;
  if (uncheckedCount === 0) return "checked";
  if (uncheckedCount === paths.length) return "unchecked";
  return "indeterminate";
}

// `relative()` from node always uses forward slashes on macOS/Linux;
// on Windows it uses backslashes. Splitting on either keeps this pure
// utility platform-agnostic and unit-testable.
function splitPath(relPath: string): string[] {
  return relPath.split(/[/\\]/).filter((s) => s.length > 0);
}

function sortRecursive(node: TreeFolder): void {
  node.folders.sort((a, b) => a.name.localeCompare(b.name));
  node.files.sort((a, b) => a.name.localeCompare(b.name));
  for (const child of node.folders) sortRecursive(child);
}
