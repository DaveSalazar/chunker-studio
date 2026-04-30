export interface FileMetadata {
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
  /** Path relative to the folder root, e.g. "codigos/cogep.pdf". */
  relativePath: string;
  size: number;
  modifiedAt: number;
  extension: string;
}

export const SUPPORTED_EXTENSIONS = ["pdf", "docx", "doc", "txt", "md"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export function isSupportedExtension(ext: string): ext is SupportedExtension {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Directories that should never be walked when scanning a folder for
 * documents. Matches the legalCanvasDesktop ignore list — saves a lot
 * of time on developer machines that point at a repo root by accident.
 */
export const IGNORED_DIRECTORIES: ReadonlySet<string> = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  "out",
  "__pycache__",
  ".next",
  ".nuxt",
  ".cache",
  ".turbo",
  "storybook-static",
]);
