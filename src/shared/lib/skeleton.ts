/**
 * Skeleton extractor for legal docs. Mirror of the Python
 * `skeleton.py` in legal-ai/corpus-viewer; the chunker calls this at
 * ingest time and writes the resulting structural fingerprint into
 * the new `skeletons` table (sections + citations + fields columns).
 *
 * Reduces a (potentially copyrighted) source body to its functional
 * scaffolding — no source prose ends up in the LLM-visible columns.
 * At drafting time the LLM receives the skeleton alone and writes
 * fresh expression against it, grounded in the cited public-domain
 * code articles via `find_legal_references`.
 *
 * Pure functions, no IO. Mirror of skeleton.py — keep the regex set
 * and heuristics aligned across both languages.
 */

import { extractTemplateFields } from "./extractTemplateFields";
import type { TemplateFieldSpec } from "./extractTemplateFields";

export interface Section {
  /** 0-based document order. */
  order: number;
  /** Heading text including its trailing terminator (`:`, `.-`). The
   *  empty string covers leading prose before the first detected
   *  heading. */
  heading: string;
  /** Field marker names that appear inside this section's body span. */
  fieldNames: string[];
  /** Citation keys ("COIP-376") that appear inside this section's body span. */
  citationKeys: string[];
}

export interface Citation {
  /** Canonical compact key, e.g. "COIP-376". */
  key: string;
  code: string;
  article: string;
}

export type Field = TemplateFieldSpec;

export interface Skeleton {
  sections: Section[];
  /** Flat dedup list across the whole doc, in first-occurrence order. */
  fields: Field[];
  /** Flat dedup list across the whole doc, in first-occurrence order. */
  citations: Citation[];
}

// ─── Heading detection ───────────────────────────────────────────────────

const HEADING_PREFIX_RE =
  /^(?:primer[ao]|segund[ao]|tercer[ao]|cuart[ao]|quint[ao]|sext[ao]|s[eé]ptim[ao]|octav[ao]|noven[ao]|d[eé]cim[ao]|[IVXLCDM]+|\d+)\s*[.\-]+[ \t]*/i;

// Single line ⇒ heading shape: optional ordinal/numeric prefix +
// UPPERCASE phrase + terminator (`:` or `.-`). Anchored at the start
// of a line so inline headings ("PRETENSIÓN.- Que ...") are caught
// just as well as standalone-line headings.
const HEADING_AT_START_RE =
  /^[ \t]*(?:(?:primer[ao]|segund[ao]|tercer[ao]|cuart[ao]|quint[ao]|sext[ao]|s[eé]ptim[ao]|octav[ao]|noven[ao]|d[eé]cim[ao]|[IVXLCDM]+|\d+)\s*[.\-]+\s*)?(?:[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ <>]*[A-ZÁÉÍÓÚÑ>]|[A-ZÁÉÍÓÚÑ])\s*[:.\-]+/i;

function isMostlyUppercaseAfterPrefix(line: string): boolean {
  let body = line.replace(HEADING_PREFIX_RE, "");
  body = body.replace(/[:.\-]+\s*$/, "").trim();
  body = body.replace(/<<[^>]*>>/g, "").trim(); // strip placeholder spans
  const letters = [...body].filter((c) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(c));
  if (letters.length < 3) return false;
  const upper = letters.filter((c) => c === c.toUpperCase()).length;
  return upper / letters.length >= 0.85;
}

export function isHeading(line: string): boolean {
  const m = matchHeadingAtStart(line);
  if (!m) return false;
  const trimmed = line.trim();
  if (!(trimmed.endsWith(":") || trimmed.endsWith(".-") || trimmed.endsWith("."))) {
    return false;
  }
  return isMostlyUppercaseAfterPrefix(trimmed);
}

interface HeadingMatch {
  heading: string;
  bodyOffsetInLine: number;
}

function matchHeadingAtStart(line: string): HeadingMatch | null {
  const m = HEADING_AT_START_RE.exec(line);
  if (!m) return null;
  if (!isMostlyUppercaseAfterPrefix(m[0].trim())) return null;
  // Skip past terminator + any whitespace before body prose.
  let after = m.index + m[0].length;
  while (after < line.length && (line[after] === " " || line[after] === "\t")) {
    after++;
  }
  return { heading: m[0].trim(), bodyOffsetInLine: after };
}

interface SectionSpan {
  heading: string;
  /** Body span start offset inside the original body. */
  start: number;
  /** Body span end offset (exclusive). */
  end: number;
}

function splitSections(body: string): SectionSpan[] {
  const heads: { lineStart: number; bodyStart: number; heading: string }[] = [];
  let cursor = 0;
  for (const line of body.split(/(\r?\n)/)) {
    if (line === "\n" || line === "\r\n") {
      cursor += line.length;
      continue;
    }
    const m = matchHeadingAtStart(line);
    if (m) {
      heads.push({
        lineStart: cursor,
        bodyStart: cursor + m.bodyOffsetInLine,
        heading: m.heading,
      });
    }
    cursor += line.length;
  }

  if (heads.length === 0) {
    return [{ heading: "", start: 0, end: body.length }];
  }
  const out: SectionSpan[] = [];
  if (heads[0].lineStart > 0) {
    out.push({ heading: "", start: 0, end: heads[0].lineStart });
  }
  for (let i = 0; i < heads.length; i++) {
    const { bodyStart, heading } = heads[i];
    const end = i + 1 < heads.length ? heads[i + 1].lineStart : body.length;
    out.push({ heading, start: bodyStart, end });
  }
  return out;
}

// ─── Citation detection ──────────────────────────────────────────────────

// Code abbreviations the corpus_chunks `source_name` column indexes
// against. Listed in order of specificity so a longer match wins
// (COOTAD before COA, etc.).
const CODES = [
  "COOTAD", "COGEP", "COFJ", "COIP", "LOTAIP", "LOSEP", "LOEI", "LOIES",
  "LRTI", "CONST", "COA", "CRE", "CNA", "CPC", "CT", "CC",
];
const CODE_RE = new RegExp(`\\b(${CODES.join("|")})\\b`);

// Full-name forms operators write inline ("Art. 1453 del Código Civil").
// Tried before CODE_RE so the longer match wins. Mirror of the Python
// `_CODE_FULLNAMES`.
const CODE_FULLNAMES: Array<[string, RegExp]> = [
  ["COIP", /C[oó]digo\s+Org[aá]nico\s+Integral\s+Penal/i],
  ["COGEP", /C[oó]digo\s+Org[aá]nico\s+General\s+de\s+Procesos/i],
  ["COFJ", /C[oó]digo\s+Org[aá]nico\s+de\s+la\s+Funci[oó]n\s+Judicial/i],
  ["COA", /C[oó]digo\s+Org[aá]nico\s+Administrativo/i],
  ["COOTAD", /C[oó]digo\s+Org[aá]nico\s+de\s+Organizaci[oó]n\s+Territorial/i],
  ["CRE", /Constituci[oó]n\s+(?:de\s+la\s+)?Rep[uú]blica(?:\s+del\s+Ecuador)?/i],
  ["CT", /C[oó]digo\s+del\s+Trabajo/i],
  ["CNA", /C[oó]digo\s+(?:de\s+la\s+)?Ni[ñn]ez\s+y\s+Adolescencia/i],
  ["CC", /C[oó]digo\s+Civil/i],
  ["LOSEP", /Ley\s+Org[aá]nica\s+(?:de|del)\s+Servicio\s+P[uú]blico/i],
  ["LRTI", /Ley\s+(?:de\s+)?R[eé]gimen\s+Tributario\s+Interno/i],
];

const ART_RE = /\bArt(?:[íi]culos?)?\.?\s*(\d+(?:\.\d+)?)\b/gi;

function resolveCode(tail: string): string {
  for (const [code, pat] of CODE_FULLNAMES) {
    if (pat.test(tail)) return code;
  }
  const m = CODE_RE.exec(tail);
  return m ? m[1] : "?";
}

export function extractCitationsFrom(span: string): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  ART_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ART_RE.exec(span)) !== null) {
    const article = m[1];
    let tail = span.slice(m.index + m[0].length, m.index + m[0].length + 100);
    // Cut at next sentence boundary or next Art reference.
    const sentEnd = /[.;]\s|\n\s/.exec(tail);
    if (sentEnd) tail = tail.slice(0, sentEnd.index);
    const nextArt = /\bArt(?:[íi]culos?)?\.?\s*\d+/i.exec(tail);
    if (nextArt && nextArt.index > 0) tail = tail.slice(0, nextArt.index);
    const code = resolveCode(tail);
    const key = `${code}-${article}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, code, article });
  }
  return out;
}

// ─── Top-level skeleton ──────────────────────────────────────────────────

export function buildSkeleton(body: string): Skeleton {
  const sectionSpans = splitSections(body);
  const sections: Section[] = [];
  const fieldsByName = new Map<string, Field>();
  const fieldOrder: string[] = [];
  const citationsByKey = new Map<string, Citation>();
  const citationOrder: string[] = [];

  sectionSpans.forEach(({ heading, start, end }, order) => {
    const span = body.slice(start, end);

    // Per-section field list (first-appearance order within the section).
    const secFieldNames: string[] = [];
    for (const f of extractTemplateFields(span)) {
      if (!fieldsByName.has(f.name)) {
        fieldsByName.set(f.name, f);
        fieldOrder.push(f.name);
      }
      if (!secFieldNames.includes(f.name)) secFieldNames.push(f.name);
    }

    // Per-section citation list.
    const secCitationKeys: string[] = [];
    for (const c of extractCitationsFrom(span)) {
      if (!citationsByKey.has(c.key)) {
        citationsByKey.set(c.key, c);
        citationOrder.push(c.key);
      }
      if (!secCitationKeys.includes(c.key)) secCitationKeys.push(c.key);
    }

    sections.push({
      order,
      heading,
      fieldNames: secFieldNames,
      citationKeys: secCitationKeys,
    });
  });

  return {
    sections,
    fields: fieldOrder.map((n) => fieldsByName.get(n)!),
    citations: citationOrder.map((k) => citationsByKey.get(k)!),
  };
}

/**
 * Body slices aligned by index with `buildSkeleton(body).sections`. The
 * persisted Section JSON deliberately omits the body — it would defeat
 * the IP-protection goal — but the chunker's review UI needs the prose
 * to let the operator confirm boundary detection before ingest.
 */
export function extractSectionBodies(body: string): string[] {
  return splitSections(body).map(({ start, end }) => body.slice(start, end));
}

/** Compose the short text used as the embedding's input. Title + type +
 *  section headings only — no source prose — so the embedded vector
 *  captures retrieval intent without leaking copyrightable expression. */
export function makeIntentSurface(
  title: string,
  docType: string,
  sections: Section[],
): string {
  const parts: string[] = [];
  if (title.trim()) parts.push(title.trim());
  if (docType) parts.push(docType);
  const headings = sections.map((s) => s.heading).filter((h) => h);
  if (headings.length > 0) parts.push(headings.join(" | "));
  return parts.join(" — ");
}
