import { injectable } from "inversify";
import type { PlaceholderNormalizer } from "../domain/PlaceholderNormalizer";

/**
 * Pattern-driven rewrite of in-template blanks into `<<PLACEHOLDER>>`
 * tokens. High-precision over recall — false positives erode trust more
 * than misses, and the operator can edit the body before indexing if
 * something slipped through.
 *
 * Pass order matters:
 *   1. Date triples ("__ de __ de 20__") — most specific shape, must
 *      match before bare-blank fallback consumes the underscores.
 *   2. Labeled blanks ("NOMBRE: ___") — uses a small Spanish field
 *      dictionary to pick a meaningful placeholder name.
 *   3. Bare blanks (3+ underscores anywhere else) — fall back to
 *      `<<DATO>>` so they're at least visible to the operator.
 */
@injectable()
export class DefaultPlaceholderNormalizer implements PlaceholderNormalizer {
  // Spanish field labels → placeholder names. Keep narrow and obvious;
  // anything ambiguous routes through the bare-blank fallback instead.
  private readonly labelDict: Array<[RegExp, string]> = [
    [/\b(?:nombres?(?:\s+y\s+apellidos?)?|apellidos?)\b/i, "NOMBRE COMPLETO"],
    [/\b(?:c[eé]dula(?:\s+de\s+(?:identidad|ciudadan[ií]a))?|c\.?c\.?|c\.?i\.?)\b/i, "NÚMERO DE CÉDULA"],
    [/\bruc\b/i, "RUC"],
    [/\bpasaporte\b/i, "NÚMERO DE PASAPORTE"],
    [/\bdirecci[oó]n\b/i, "DIRECCIÓN"],
    [/\b(?:tel[eé]fono|celular|m[oó]vil)\b/i, "TELÉFONO"],
    [/\b(?:correo(?:\s+electr[oó]nico)?|e-?mail)\b/i, "CORREO ELECTRÓNICO"],
    [/\bfecha\b/i, "FECHA"],
    [/\b(?:monto|valor|suma|cuant[ií]a|precio)\b/i, "MONTO"],
    [/\bciudad\b/i, "CIUDAD"],
    [/\bcant[oó]n\b/i, "CANTÓN"],
    [/\bprovincia\b/i, "PROVINCIA"],
    [/\bpa[ií]s\b/i, "PAÍS"],
    [/\bprofesi[oó]n\b/i, "PROFESIÓN"],
    [/\bestado\s+civil\b/i, "ESTADO CIVIL"],
    [/\bnacionalidad\b/i, "NACIONALIDAD"],
    [/\bedad\b/i, "EDAD"],
    [/\bcasillero(?:\s+judicial)?\b/i, "CASILLERO JUDICIAL"],
    [/\bjuzgado\b/i, "NOMBRE DEL JUZGADO"],
  ];

  // 3+ underscores, optionally with embedded spaces/tabs (PDFs sometimes
  // intersperse them). Drives both the bare-blank fallback and the
  // labeled-blank capture. Don't anchor to start — blanks appear inline
  // in template prose ("la suma de US$ ____").
  private readonly blankRun = /_(?:[ \t]*_){2,}/g;

  // "DD de MM de 20YY" with each component as an underscore run. Captures
  // the canonical Ecuadorian template date triple. Allows whitespace
  // variations and either "de" or "del" for the year separator.
  private readonly dateTriple =
    /_(?:[ \t]*_){1,}\s+de\s+_(?:[ \t]*_){1,}\s+(?:de|del)\s+(?:20)?_(?:[ \t]*_){1,}/gi;

  normalize(text: string): string {
    let out = text;
    out = out.replace(this.dateTriple, "<<DÍA>> de <<MES>> de <<AÑO>>");
    out = this.applyLabeledBlanks(out);
    out = out.replace(this.blankRun, "<<DATO>>");
    return out;
  }

  /**
   * For each known label, find "LABEL: ___" or "LABEL ___" within a
   * short window and rewrite to `<<MAPPED>>`. Bounded lookahead on the
   * label keeps us from chewing through unrelated underscored content.
   */
  private applyLabeledBlanks(text: string): string {
    let out = text;
    for (const [labelRe, placeholder] of this.labelDict) {
      // Match: <label> [: ]? <blanks>. Uses a fresh per-call regex so
      // the global flag's lastIndex doesn't carry between invocations.
      const re = new RegExp(
        labelRe.source + "\\s*:?\\s*_(?:[ \\t]*_){2,}",
        "gi",
      );
      out = out.replace(re, (full) => {
        // Preserve the original label casing and add the placeholder
        // as the value — the label stays so the document still reads
        // naturally ("Nombre: <<NOMBRE COMPLETO>>").
        const labelMatch = full.match(labelRe);
        const label = labelMatch ? labelMatch[0] : "";
        return `${label}: <<${placeholder}>>`;
      });
    }
    return out;
  }
}
