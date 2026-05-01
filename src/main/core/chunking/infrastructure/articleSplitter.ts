import type { ChunkSettings, RawChunk } from "../domain/ChunkingEntities";

// Article markers anchored to start-of-line so a mid-sentence "Art. 5"
// citation isn't mistaken for a chunk boundary. The number capture
// accepts dotted notation ("Art. 140.1.-") used for sub-articles added
// by reform — the COOTAD code is a heavy user. PARTE comes before
// PART in the alternation: alternation is left-greedy, and PART would
// otherwise short-circuit a Spanish "PARTE I" match.
const ARTICLE_PATTERN =
  /(?:^|\n)(?:Art(?:ículo|iculo|icle)?\.?|Sec(?:tion)?\.?|§)\s*(\d+(?:\.\d+)*[A-Z]?)[\.\-\s:]/gi;

// `DISPOSICI[OÓ]N(?:ES)?` covers all four forms commonly seen in
// Spanish legal codes: DISPOSICION, DISPOSICIÓN (singular, with/without
// accent stripped), DISPOSICIONES, DISPOSICIÓNES (plural). The earlier
// pattern matched only the singular forms because `\b` after
// `DISPOSICIÓN` failed against `DISPOSICIONES`.
export const HEADING_PATTERN =
  /^(CAPÍTULO|SECCIÓN|TÍTULO|LIBRO|PARTE|DISPOSICI[OÓ]N(?:ES)?|CHAPTER|SECTION|TITLE|BOOK|PART)\b/i;

// Lettered-point markers inside long articles ("a)", "b)", ...). Used
// as preferred split boundaries when an article exceeds the char
// budget — splitting blindly on lines tears sentences in half, but
// splitting on lettered points keeps each enumerated clause intact.
const LETTERED_POINT_PATTERN = /^\s*[a-z]\)\s/i;

export interface ArticleMatch {
  article: string;
  start: number;
}

export function findArticles(text: string): ArticleMatch[] {
  const out: ArticleMatch[] = [];
  // matchAll handles the /g lastIndex bookkeeping so the helper is
  // pure — repeated calls don't carry state from a previous run.
  for (const m of text.matchAll(ARTICLE_PATTERN)) {
    if (m.index === undefined) continue;
    // The match may include a leading newline; advance start past it
    // so "Art. 1480" sits at the chunk boundary.
    const offset = m.index + (text[m.index] === "\n" ? 1 : 0);
    out.push({ article: m[1], start: offset });
  }
  return out;
}

export function splitByArticles(
  text: string,
  matches: ArticleMatch[],
  settings: ChunkSettings,
): RawChunk[] {
  const chunks: RawChunk[] = [];
  let currentHeading: string | null = null;

  for (let i = 0; i < matches.length; i++) {
    const { article, start } = matches[i];
    const end = i + 1 < matches.length ? matches[i + 1].start : text.length;

    // Look back a bounded window for the most recent section heading.
    const lookbackStart = Math.max(0, start - settings.headingLookback);
    const prevText = text.slice(lookbackStart, start);
    const prevLines = prevText.split("\n").reverse();
    for (const rawLine of prevLines) {
      const line = rawLine.trim();
      if (HEADING_PATTERN.test(line)) {
        currentHeading = line;
        break;
      }
    }

    const body = text.slice(start, end).trim();
    if (body.length < settings.minChunkChars) continue;

    // Store the bare identifier ("1", "140.1") — display layers prepend
    // "Art. " when rendering. Storing "Art. 1" caused viewers to render
    // "Art. Art. 1" when they prepended their own label.
    const charBudget = settings.maxChunkTokens * 5;
    if (body.length > charBudget) {
      chunks.push(
        ...subdivideLong(body, article, currentHeading, start, settings),
      );
    } else {
      chunks.push({
        text: body,
        article,
        heading: currentHeading,
        startOffset: start,
        endOffset: end,
      });
    }
  }
  return chunks;
}

function subdivideLong(
  body: string,
  article: string,
  heading: string | null,
  baseOffset: number,
  settings: ChunkSettings,
): RawChunk[] {
  const lines = body.split("\n");
  const charBudget = settings.maxChunkTokens * 4;
  // When the article enumerates clauses ("a)", "b)", ...), prefer to
  // break at those boundaries so each clause survives intact.
  const hasPoints = lines.some((l) => LETTERED_POINT_PATTERN.test(l));
  const out: RawChunk[] = [];
  let buffer: string[] = [];
  let bufferLen = 0;
  // Offsets tracked relative to the body, then translated to the outer
  // document via baseOffset on flush. Newline separators count only
  // between lines, never trailing — matches body.split("\n") +
  // buffer.join("\n").
  let chunkStartInBody = 0;
  let cursorInBody = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n");
    out.push({
      text,
      article,
      heading,
      startOffset: baseOffset + chunkStartInBody,
      endOffset: baseOffset + chunkStartInBody + text.length,
    });
    buffer = [];
    bufferLen = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sepLen = i < lines.length - 1 ? 1 : 0;
    const sepIfNotFirst = buffer.length > 0 ? 1 : 0;
    const isPointStart = hasPoints && LETTERED_POINT_PATTERN.test(line);
    // Break on a lettered-point boundary only after the buffer has
    // enough body — otherwise tiny "a)" headers would each become
    // their own chunk and we'd lose the article's lead-in paragraph.
    const shouldBreakOnPoint =
      isPointStart &&
      bufferLen >= settings.minChunkChars &&
      bufferLen + sepIfNotFirst + line.length > charBudget;
    const wouldOverflow =
      bufferLen + sepIfNotFirst + line.length > charBudget && buffer.length > 0;
    if ((shouldBreakOnPoint || wouldOverflow) && buffer.length > 0) {
      flush();
      chunkStartInBody = cursorInBody;
    }
    buffer.push(line);
    bufferLen += (buffer.length > 1 ? 1 : 0) + line.length;
    cursorInBody += line.length + sepLen;
  }
  flush();
  return out;
}
