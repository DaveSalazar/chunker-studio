/**
 * Placeholder detection + normalization shared between the chunker
 * worker (rewrites blanks at chunk time) and the renderer (previews
 * matches in the workspace before the operator commits to indexing).
 *
 * Two pure exports:
 *   - analyzePlaceholders(text) → list of matches with positions and
 *     the inferred placeholder name. Used for the preview panel.
 *   - normalizePlaceholders(text) → text with every match rewritten
 *     into <<PLACEHOLDER>> form. Used by the wholeDocument chunker.
 *
 * Pattern set was tuned from a 195-file corpus scan of Ecuadorian
 * notarial / civil templates: 97.9% of files use the Unicode ellipsis
 * `…` as the fillable blank, 1.5% use underscore runs. Both supported.
 * Operator-visible labels (the words that sit immediately before a
 * blank, sometimes with a connector like "de" / "número") are mapped
 * via a Spanish legal-field dictionary; anything not on the dictionary
 * falls through to a generic <<DATO>> tag so it stays visible.
 */

export interface PlaceholderMatch {
  /** Inferred placeholder name without the angle brackets, e.g. "NOMBRE COMPLETO". */
  name: string;
  /** Substring that was matched, e.g. "cédula de ciudadanía No. ……". */
  raw: string;
  /** Replacement string, e.g. "cédula de ciudadanía No. <<NÚMERO DE CÉDULA>>". */
  replacement: string;
  /** Char offsets into the input text (start inclusive, end exclusive). */
  start: number;
  end: number;
}

// ─────────────────────────────────────────────────────────────────────
// Pattern primitives — composed into the actual matchers below.
// ─────────────────────────────────────────────────────────────────────

// One blank marker. Three families are accepted:
//   - 3+ underscores (with optional embedded whitespace), or
//   - 1+ Unicode ellipsis (with optional embedded whitespace), or
//   - 3+ ASCII dots ("..." used by Word's autocorrect).
// 3 is the min on underscores so "ID__001" (Word doc IDs) is left alone;
// the corpus that does use underscores almost always uses 5+ in a row.
const BLANK = "(?:_(?:[ \\t]*_){2,}|…(?:[ \\t]*…)*|\\.{3,})";

// Looser blank used inside the date-triple shape — the year suffix
// often appears as "20__" (only 2 underscores) and is unambiguous in
// context, so we accept the shorter run.
const DATE_BLANK = "(?:_{2,}|…+|\\.{3,})";

// Optional connector words between a label and its blank.
//   "provincia de ……"  → connector " de"
//   "cédula de ciudadanía número ……"  → captured by the label regex itself
//   "casillero judicial electrónico ……"  → no connector
const CONNECTOR =
  "(?:\\s+(?:de\\s+(?:la|los|las|el|el\\s+señor|el\\s+señora)\\s+|de|del|n(?:o|°|º|úmero|umero)?\\.?))?";

// Optional trailing punctuation that the operator may have typed
// between the label and the blank ("NOMBRE: …", "FIRMA, …").
const PUNCT = "[:.,;]?";

// Spanish legal field labels → placeholder name. Order matters:
// entries are tried top-to-bottom, so list the more specific phrase
// first ("cédula de ciudadanía") before the generic fallback ("cédula").
type LabelEntry = { labelRe: RegExp; name: string };

const LABEL_DICT: LabelEntry[] = [
  // Identifiers
  { labelRe: /c[eé]dula\s+de\s+(?:ciudadan[ií]a|identidad)\s*(?:n(?:o|°|º|úmero|umero)?\.?)?/i, name: "NÚMERO DE CÉDULA" },
  { labelRe: /\bn(?:o|°|º|úmero|umero)?\.?\s*de\s+c[eé]dula/i, name: "NÚMERO DE CÉDULA" },
  // "C.C." / "C. C." — abbreviation operators type on signature lines.
  // Listed before generic "cédula" so the abbreviation shape claims first.
  { labelRe: /\bc\.\s*c\.?/i, name: "NÚMERO DE CÉDULA" },
  { labelRe: /\bc[eé]dula\b/i, name: "NÚMERO DE CÉDULA" },
  { labelRe: /\bruc\b/i, name: "RUC" },
  { labelRe: /\bpasaporte\b/i, name: "NÚMERO DE PASAPORTE" },
  // Judicial routing
  { labelRe: /casillero\s+judicial(?:\s+electr[oó]nico)?/i, name: "CASILLERO JUDICIAL" },
  { labelRe: /domicilio\s+judicial/i, name: "CASILLERO JUDICIAL" },
  { labelRe: /\bjuzgado\b/i, name: "NOMBRE DEL JUZGADO" },
  { labelRe: /\bjuez\b/i, name: "NOMBRE DEL JUZGADO" },
  { labelRe: /\bnotario\b/i, name: "NOMBRE DEL NOTARIO" },
  // Document references
  { labelRe: /n(?:o|°|º|úmero|umero)?\.?\s+de\s+resoluci[oó]n/i, name: "NÚMERO DE RESOLUCIÓN" },
  { labelRe: /\bresoluci[oó]n\b/i, name: "NÚMERO DE RESOLUCIÓN" },
  { labelRe: /\bexpediente\b/i, name: "NÚMERO DE EXPEDIENTE" },
  { labelRe: /\bcausa\b/i, name: "NÚMERO DE CAUSA" },
  { labelRe: /\bart[ií]culo\b/i, name: "NÚMERO DE ARTÍCULO" },
  { labelRe: /\bcl[aá]usula\b/i, name: "NÚMERO DE CLÁUSULA" },
  // Contact
  { labelRe: /correo\s+electr[oó]nico/i, name: "CORREO ELECTRÓNICO" },
  { labelRe: /\be-?mail\b/i, name: "CORREO ELECTRÓNICO" },
  { labelRe: /tel[eé]fono\s+(?:convencional|celular|m[oó]vil)/i, name: "TELÉFONO" },
  { labelRe: /\bcelular\b/i, name: "TELÉFONO" },
  { labelRe: /\btel[eé]fono\b/i, name: "TELÉFONO" },
  // Person — names. Role-based labels (señor, demandante, etc.) all map
  // to NOMBRE COMPLETO since the role is already stated by surrounding text.
  { labelRe: /\bnombres\s+y\s+apellidos\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bapellidos\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bnombres?\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bse[ñn]or(?:a|es|as|\/a)?\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bc[oó]nyuges?\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bcompareciente\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bmenor(?:es)?\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\byo\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bnosotros\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bdemandant[es]\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bdemandad[oa]s?\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bacusad[oa]s?\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bacusador(?:[ae])?\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bdenunciant[es]\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bdenunciad[oa]s?\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bquerellant[es]\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bquerellad[oa]s?\b/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\btestigos?\b/i, name: "NOMBRE COMPLETO" },
  // Lawyer (specific phrasing first, then abbreviations, then generic)
  { labelRe: /abogado\s+patrocinador/i, name: "ABOGADO PATROCINADOR" },
  { labelRe: /\bpatrocinador\b/i, name: "ABOGADO PATROCINADOR" },
  { labelRe: /\babogad[oa]\b/i, name: "ABOGADO PATROCINADOR" },
  // Honorific abbreviations: Ab. / Dr. / Ing. preceding a name. The
  // composition's `\s*BLANK` tail prevents false matches inside longer
  // words like "abandono" / "drama" — the BLANK won't match when the
  // following chars are letters, so the whole pattern fails to fire.
  { labelRe: /\bab(?:\/a)?\.?/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bdr(?:a|\/a)?\.?/i, name: "NOMBRE COMPLETO" },
  { labelRe: /\bing\.?/i, name: "NOMBRE COMPLETO" },
  // Person — attributes
  { labelRe: /estado\s+civil/i, name: "ESTADO CIVIL" },
  { labelRe: /nacionalidad/i, name: "NACIONALIDAD" },
  { labelRe: /\bedad\b/i, name: "EDAD" },
  { labelRe: /\bprofesi[oó]n\b|\bocupaci[oó]n\b/i, name: "PROFESIÓN" },
  // Companies / organizations
  { labelRe: /(?:nombre\s+de\s+la\s+)?compa[ñn][ií]a/i, name: "NOMBRE DE LA COMPAÑÍA" },
  { labelRe: /raz[oó]n\s+social/i, name: "RAZÓN SOCIAL" },
  { labelRe: /\bbanco\b/i, name: "NOMBRE DEL BANCO" },
  // Vehicle attributes
  { labelRe: /marca(?:\s+del?\s+veh[ií]culo)?/i, name: "MARCA DEL VEHÍCULO" },
  { labelRe: /modelo(?:\s+del?\s+veh[ií]culo)?/i, name: "MODELO DEL VEHÍCULO" },
  { labelRe: /\bclase\b/i, name: "CLASE DEL VEHÍCULO" },
  { labelRe: /\bcolor\b/i, name: "COLOR DEL VEHÍCULO" },
  { labelRe: /\bplacas?\b/i, name: "NÚMERO DE PLACA" },
  { labelRe: /n(?:o|°|º|úmero|umero)?\.?\s+de\s+motor/i, name: "NÚMERO DE MOTOR" },
  { labelRe: /\bmotor\b/i, name: "NÚMERO DE MOTOR" },
  { labelRe: /cilindraje/i, name: "CILINDRAJE" },
  { labelRe: /n(?:o|°|º|úmero|umero)?\.?\s+de\s+chasis/i, name: "NÚMERO DE CHASIS" },
  { labelRe: /\bchasis\b/i, name: "NÚMERO DE CHASIS" },
  // Property — boundaries (linderos) and physical descriptors
  { labelRe: /\blindero\b|\blinde\b/i, name: "LINDERO" },
  { labelRe: /\bnorte\b/i, name: "LINDERO NORTE" },
  { labelRe: /\bsur\b/i, name: "LINDERO SUR" },
  { labelRe: /\boeste\b/i, name: "LINDERO OESTE" },
  { labelRe: /\beste\b/i, name: "LINDERO ESTE" },
  { labelRe: /\bsuperficie\b/i, name: "SUPERFICIE" },
  { labelRe: /\bmanzana\b/i, name: "MANZANA" },
  { labelRe: /\blote\b/i, name: "LOTE" },
  // Address
  { labelRe: /\bdirecci[oó]n\b/i, name: "DIRECCIÓN" },
  { labelRe: /\bavenida\b|\bav\.?\b/i, name: "AVENIDA" },
  { labelRe: /\bcalle\b/i, name: "CALLE" },
  { labelRe: /\bedificio\b/i, name: "EDIFICIO" },
  { labelRe: /\bbarrio\b/i, name: "BARRIO" },
  { labelRe: /\bpiso\b/i, name: "PISO" },
  { labelRe: /lotizaci[oó]n/i, name: "LOTIZACIÓN" },
  { labelRe: /\bsector\b/i, name: "SECTOR" },
  { labelRe: /\bparroquia\b/i, name: "PARROQUIA" },
  { labelRe: /\bcant[oó]n\b/i, name: "CANTÓN" },
  { labelRe: /\bprovincia\b/i, name: "PROVINCIA" },
  { labelRe: /\bciudad\b/i, name: "CIUDAD" },
  { labelRe: /\bpa[ií]s\b/i, name: "PAÍS" },
  // Money / accounts
  { labelRe: /\bmonto\b|\bvalor\b|\bsuma\b|\bcuant[ií]a\b|\bprecio\b/i, name: "MONTO" },
  { labelRe: /n(?:o|°|º|úmero|umero)?\.?\s+de\s+factura/i, name: "NÚMERO DE FACTURA" },
  { labelRe: /\bfactura\b/i, name: "NÚMERO DE FACTURA" },
  { labelRe: /n(?:o|°|º|úmero|umero)?\.?\s+de\s+(?:cuenta|ahorros)/i, name: "NÚMERO DE CUENTA" },
  { labelRe: /\bahorros\b/i, name: "NÚMERO DE CUENTA" },
  // Date components (single — date triples handled in their own pass)
  { labelRe: /\bfecha\b/i, name: "FECHA" },
  { labelRe: /\bd[ií]a\b/i, name: "DÍA" },
  { labelRe: /\bmes\b/i, name: "MES" },
  // Signature
  { labelRe: /\bfirma\b/i, name: "FIRMA" },
  // "f." — signature line marker. Safe because the composition's `\s*BLANK`
  // tail won't match if a real word follows (e.g. "f) literal" never matches).
  { labelRe: /\bf\./i, name: "FIRMA" },
  // Misc
  { labelRe: /\bmat(?:r[ií]cula)?\.?/i, name: "MATRÍCULA" },
];

// Date triple: "DD de MM de 20YY" with each component a blank. The
// connector "de"/"del" is matched with optional spaces on either side
// because the corpus shows mammoth often emits "…… de……" with no
// space after "de".
const DATE_TRIPLE = new RegExp(
  `${DATE_BLANK}\\s*de\\s*${DATE_BLANK}\\s*(?:de|del)\\s*(?:20)?${DATE_BLANK}`,
  "gi",
);

// Hyphen-separated date triple — "DD-MM-YYYY" with any blank shape.
// 9.2% of the inspected corpus (18/195 files) uses this form. The
// year segment may carry a literal "20" prefix or be a fully blank
// run on its own, same as the "de" form above.
const DATE_TRIPLE_HYPHEN = new RegExp(
  `${DATE_BLANK}\\s*-\\s*${DATE_BLANK}\\s*-\\s*(?:20)?${DATE_BLANK}`,
  "g",
);

// Same shape as DATE_TRIPLE but year position is written-out as "dos mil ___".
// Common in older notarial templates: "el ___ de ___ de dos mil ___".
// `[\s.,;]*` separators absorb stray dots/commas the operator left between
// the blank and the connector — e.g. "….  de……. de dos mil ……".
const DATE_TRIPLE_DOSMIL = new RegExp(
  `${DATE_BLANK}[\\s.,;]*de[\\s.,;]*${DATE_BLANK}[\\s.,;]*(?:de|del)[\\s.,;]*dos\\s+mil[\\s.,;]*${DATE_BLANK}`,
  "gi",
);

// "20…" — bare year stub when only the suffix is fillable.
const YEAR_STUB = /\b20(?:_{2,}|…+|\.{3,})/g;

// Written-out year forms common in older notarial templates:
//   "dos mil ……"        → year placeholder via blank
//   "dos mil veintiséis" → year filled with a Spanish numeral word
// Captured together because the operator's intent is identical (year
// goes here) and the replacement is the same. Trailing `\s*` (was `\s+`)
// matches "dos mil…" with no space — operators routinely omit it.
const DOS_MIL_YEAR = new RegExp(
  `\\bdos\\s+mil\\s*(?:${DATE_BLANK}|veint\\w*|treint\\w*|cuarent\\w*|cincuent\\w*|sesent\\w*|setent\\w*|ochent\\w*|noven\\w*|cien|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|diecis[eé]is|diecisiete|dieciocho|diecinueve)`,
  "gi",
);

// "del año ……" / "del año 2026" — the labeled-year fallback. Trailing
// `\s*` (was `\s+`) so "del año…" with no space still matches.
const DEL_ANO_YEAR = new RegExp(
  `\\bdel?\\s+a[ñn]o\\s*(?:${DATE_BLANK}|20\\d{2})`,
  "gi",
);

// Email pair: <blank>@<blank>. Permissive separator absorbs stray dots /
// ellipses that often sit between the blank and the @ (e.g. "….@…").
// Runs AFTER the labeled-blanks pass so a "casillero judicial electrónico"
// (or "correo electrónico") prefix gets its specific label first; this
// matcher only catches truly unlabeled email pairs.
const EMAIL_PAIR = new RegExp(`${BLANK}[\\s.,;…]*@[\\s.,;…]*${BLANK}`, "g");

// Optional @-tail appended to every labeled-blank composition so a label
// like "correo electrónico ___@___" gets a SINGLE marker instead of
// "<<LABEL>>@<<DATO>>". The tail is non-capturing and only fires when
// the @-pair is actually present.
const EMAIL_TAIL = `(?:[\\s.,;…]*@[\\s.,;…]*${BLANK})?`;

const BARE_BLANK = new RegExp(BLANK, "g");

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export function analyzePlaceholders(text: string): PlaceholderMatch[] {
  const out: PlaceholderMatch[] = [];
  const claimed = new Array(text.length).fill(false);

  // Pass 1: date triples — most specific shape, claim spans first.
  // Both the "DD de MM de 20YY" prose form and the "DD-MM-YYYY" hyphen
  // form land here because they semantically mean the same thing.
  for (const re of [DATE_TRIPLE, DATE_TRIPLE_HYPHEN]) {
    pushMatches(out, claimed, text, re, () => ({
      name: "FECHA",
      replacement: "<<DÍA>> de <<MES>> de <<AÑO>>",
    }));
  }
  // The "dos mil" written-out year variant: "el ___ de ___ de dos mil ___".
  pushMatches(out, claimed, text, DATE_TRIPLE_DOSMIL, () => ({
    name: "FECHA",
    replacement: "<<DÍA>> de <<MES>> de dos mil <<AÑO>>",
  }));

  // Pass 2: year stubs (bare, "dos mil …", "del año …"). All three
  // resolve to the same <<AÑO>> placeholder — the operator just typed
  // a different scaffold for the same field.
  pushMatches(out, claimed, text, YEAR_STUB, () => ({
    name: "AÑO",
    replacement: "<<AÑO>>",
  }));
  pushMatches(out, claimed, text, DOS_MIL_YEAR, () => ({
    name: "AÑO",
    replacement: "dos mil <<AÑO>>",
  }));
  pushMatches(out, claimed, text, DEL_ANO_YEAR, () => ({
    name: "AÑO",
    replacement: "del año <<AÑO>>",
  }));

  // Pass 3: labeled blanks. Each label gets a regex composed with the
  // connector / punctuation / blank tail; the captured prefix is
  // preserved verbatim in the replacement so the document still reads
  // naturally ("cédula de ciudadanía No. <<NÚMERO DE CÉDULA>>"). The
  // optional EMAIL_TAIL absorbs the @-domain half when the blank is the
  // local-part of an email — so "correo electrónico ___@___" becomes
  // "correo electrónico <<CORREO ELECTRÓNICO>>" instead of
  // "<<CORREO ELECTRÓNICO>>@<<DATO>>".
  for (const entry of LABEL_DICT) {
    const composed = new RegExp(
      `((?:${entry.labelRe.source})${CONNECTOR}${PUNCT})\\s*${BLANK}${EMAIL_TAIL}`,
      "gi",
    );
    pushMatches(out, claimed, text, composed, (m) => ({
      name: entry.name,
      replacement: `${m[1]} <<${entry.name}>>`,
    }));
  }

  // Pass 4: residual unlabeled email pairs. Anything <<>>@<<>> that
  // didn't get claimed by a labeled prefix in Pass 3 still deserves a
  // single CORREO ELECTRÓNICO marker rather than two separate ones.
  pushMatches(out, claimed, text, EMAIL_PAIR, () => ({
    name: "CORREO ELECTRÓNICO",
    replacement: "<<CORREO ELECTRÓNICO>>",
  }));

  // Pass 5: bare blanks that didn't get claimed by any of the above
  // — surface as <<DATO>> so the operator notices.
  pushMatches(out, claimed, text, BARE_BLANK, () => ({
    name: "DATO",
    replacement: "<<DATO>>",
  }));

  out.sort((a, b) => a.start - b.start);
  return out;
}

export function normalizePlaceholders(text: string): string {
  const matches = analyzePlaceholders(text);
  if (matches.length === 0) return text;
  // Walk in reverse so each splice doesn't shift the offsets of the
  // matches we haven't applied yet.
  let out = text;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    out = out.slice(0, m.start) + m.replacement + out.slice(m.end);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

interface MatchDecision {
  name: string;
  replacement: string;
}

function pushMatches(
  out: PlaceholderMatch[],
  claimed: boolean[],
  text: string,
  re: RegExp,
  decide: (m: RegExpExecArray) => MatchDecision,
): void {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (overlapsClaimed(claimed, start, end)) continue;
    const decision = decide(m);
    out.push({
      name: decision.name,
      raw: m[0],
      replacement: decision.replacement,
      start,
      end,
    });
    for (let i = start; i < end; i++) claimed[i] = true;
  }
}

function overlapsClaimed(
  claimed: boolean[],
  start: number,
  end: number,
): boolean {
  for (let i = start; i < end; i++) if (claimed[i]) return true;
  return false;
}
