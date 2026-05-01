import { isAbsolute, sep } from "node:path";

/**
 * Reject IPC inputs that would let a compromised renderer point at
 * arbitrary or relative locations. Only validates *shape*; whether the
 * caller is allowed to read a specific absolute path is a separate
 * filesystem-permissions concern.
 *
 * Throws on:
 *   - non-string / empty paths
 *   - relative paths (`./foo`, `foo/bar`)
 *   - any segment equal to `..` (prevents `picked/../etc/passwd` after
 *     the renderer concatenates a "safe" picked-folder with a relative
 *     subpath)
 *   - null bytes (some POSIX paths do include them; we don't)
 */
export function assertSafePath(input: unknown, label = "path"): string {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error(`Invalid ${label}: expected a non-empty string`);
  }
  if (input.includes("\0")) {
    throw new Error(`Invalid ${label}: contains null byte`);
  }
  if (!isAbsolute(input)) {
    throw new Error(`Invalid ${label}: must be an absolute path`);
  }
  // Split on both POSIX and Windows separators so paths from either
  // platform get the same `..` rejection.
  const segments = input.split(/[\\/]/);
  if (segments.some((s) => s === "..")) {
    throw new Error(`Invalid ${label}: contains '..' segment`);
  }
  // Normalize to OS-native separator so callers don't have to.
  return sep === "/" ? input : input.replace(/\//g, sep);
}
