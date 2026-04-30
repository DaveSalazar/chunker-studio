import type { ChunkSettings } from "../../../../shared/types";

export function safeParseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function safeParseSettings(raw: string): ChunkSettings {
  try {
    return JSON.parse(raw) as ChunkSettings;
  } catch {
    // Caller treats this as a soft signal; the real source of truth is
    // the settingsHash on the row, not these reconstituted fields.
    return {
      maxChunkTokens: 0,
      minChunkChars: 0,
      headingLookback: 0,
      letterRatio: 0,
      dehyphenate: false,
      splitByArticle: false,
      duplicateMinChars: 0,
      dropDuplicates: false,
    };
  }
}
