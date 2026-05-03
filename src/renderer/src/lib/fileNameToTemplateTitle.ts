/**
 * Best-effort cleanup of a template filename into a human display title.
 *
 *   "aclaratoria-y-rectificatoria-minuta-notarial.docx"
 *     → "Minuta aclaratoria y rectificatoria (notarial)"
 *
 * Operators see this in the IngestDialog as a pre-filled default they
 * can edit before indexing — so it's fine to be heuristic. The two
 * specific signals worth recovering:
 *   - the document kind ("minuta", "demanda", "contrato", …) is
 *     usually the file's tail token; surface it as the leading word
 *     so the title reads naturally.
 *   - jurisdictional / branch markers ("notarial", "judicial",
 *     "civil", "penal", …) are typically the very last token; surface
 *     them in parentheses.
 *
 * The transform is pure and idempotent on already-clean inputs.
 */

const EXTENSION = /\.(docx?|pdf|txt|md)$/i;

const KIND_WORDS = new Set([
  "minuta",
  "demanda",
  "contrato",
  "escrito",
  "denuncia",
  "querella",
  "guia",
  "manual",
  "plantilla",
  "acta",
  "poder",
  "recurso",
  "oficio",
]);

const BRANCH_WORDS = new Set([
  "notarial",
  "judicial",
  "civil",
  "penal",
  "laboral",
  "familia",
  "constitucional",
  "administrativo",
  "tributario",
  "mercantil",
  "comercial",
  "societario",
  "inquilinato",
  "multicompetente",
]);

export function fileNameToTemplateTitle(fileName: string): string {
  const noExt = fileName.replace(EXTENSION, "");
  const tokens = noExt
    .split(/[-_\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return "";

  const lower = tokens.map((t) => t.toLowerCase());

  // Pull a kind word out of any position; a trailing branch marker only
  // counts when it's strictly the last token (matches naming convention).
  const kindIdx = lower.findIndex((t) => KIND_WORDS.has(t));
  const lastIdx = lower.length - 1;
  const branchIdx = BRANCH_WORDS.has(lower[lastIdx]) ? lastIdx : -1;

  // The "rest" is everything that isn't the kind or the branch — those
  // become the descriptive middle of the title.
  const restIndices = lower
    .map((_, i) => i)
    .filter((i) => i !== kindIdx && i !== branchIdx);
  const rest = restIndices.map((i) => lower[i]).join(" ");

  const parts: string[] = [];
  if (kindIdx >= 0) parts.push(lower[kindIdx]);
  if (rest) parts.push(rest);
  const main = parts.join(" ").trim();
  const sentenced = main ? main[0].toUpperCase() + main.slice(1) : "";

  if (branchIdx >= 0) {
    return sentenced ? `${sentenced} (${lower[branchIdx]})` : lower[branchIdx];
  }
  return sentenced;
}
