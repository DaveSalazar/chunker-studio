import { createHash } from "crypto";
import type { ChunkSettings } from "../../../../shared/types";

export function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hashSettings(settings: ChunkSettings): string {
  // Enumerate fields explicitly: only inputs that affect the chunker's
  // OUTPUT belong in the hash. View-only fields like `duplicateMinChars`
  // must NOT be included — they'd invalidate the chunk cache for free.
  const stable = JSON.stringify({
    dehyphenate: settings.dehyphenate,
    headingLookback: settings.headingLookback,
    letterRatio: settings.letterRatio,
    maxChunkTokens: settings.maxChunkTokens,
    minChunkChars: settings.minChunkChars,
    splitByArticle: settings.splitByArticle,
  });
  return createHash("sha256").update(stable, "utf8").digest("hex");
}
