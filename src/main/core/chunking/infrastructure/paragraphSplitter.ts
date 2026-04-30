import type { ChunkSettings, RawChunk } from "../domain/ChunkingEntities";

interface Paragraph {
  text: string;
  start: number;
  end: number;
}

export function chunkByParagraphs(
  text: string,
  settings: ChunkSettings,
): RawChunk[] {
  // Locate every paragraph (run of non-blank lines) with its true offsets
  // in the normalized text. Tracking offsets while we split is what makes
  // accurate highlighting possible later — `text.split` would lose them.
  const paragraphs = locateParagraphs(text);

  const charBudget = settings.maxChunkTokens * 4;
  const out: RawChunk[] = [];
  let buffer: { text: string }[] = [];
  let bufferLen = 0;
  let chunkStart = 0;
  let chunkEnd = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    // Embedded text uses a normalized "\n\n" separator so the chunk is
    // what would actually be sent to OpenAI. The [chunkStart, chunkEnd)
    // range still points to the original normalized text for highlighting.
    const joined = buffer.map((p) => p.text).join("\n\n");
    out.push({
      text: joined,
      article: null,
      heading: null,
      startOffset: chunkStart,
      endOffset: chunkEnd,
    });
    buffer = [];
    bufferLen = 0;
  };

  for (const para of paragraphs) {
    if (bufferLen + para.text.length > charBudget && buffer.length > 0) {
      flush();
    }
    if (buffer.length === 0) chunkStart = para.start;
    buffer.push({ text: para.text });
    chunkEnd = para.end;
    bufferLen += para.text.length;
  }
  flush();
  return out;
}

/**
 * Walk the text line by line, grouping non-blank lines into paragraphs
 * and recording where each paragraph starts/ends in the original string.
 * Returns trimmed paragraph text plus its precise range — accurate
 * offsets are what lets the renderer highlight the exact source spans
 * that fed each chunk.
 */
function locateParagraphs(text: string): Paragraph[] {
  const out: Paragraph[] = [];
  let cursor = 0;
  let openStart: number | null = null;
  let openEnd = 0;

  const finalize = () => {
    if (openStart === null) return;
    const slice = text.slice(openStart, openEnd);
    const trimmed = slice.trim();
    if (trimmed.length > 0) {
      // Tighten the [start, end) range so it doesn't include the
      // leading/trailing whitespace stripped from `trimmed`.
      const leading = slice.length - slice.trimStart().length;
      const trailing = slice.length - slice.trimEnd().length;
      out.push({
        text: trimmed,
        start: openStart + leading,
        end: openEnd - trailing,
      });
    }
    openStart = null;
  };

  while (cursor < text.length) {
    const nl = text.indexOf("\n", cursor);
    const lineEnd = nl === -1 ? text.length : nl;
    const line = text.slice(cursor, lineEnd);
    const isBlank = line.trim().length === 0;

    if (isBlank) {
      finalize();
    } else {
      if (openStart === null) openStart = cursor;
      openEnd = lineEnd;
    }
    cursor = nl === -1 ? text.length : nl + 1;
  }
  finalize();
  return out;
}
