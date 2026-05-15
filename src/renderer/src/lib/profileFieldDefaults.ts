import { fileNameToTemplateTitle } from "@/lib/fileNameToTemplateTitle";
import type { DocumentFieldOption, SchemaProfile } from "@shared/types";

/**
 * Strip the file extension to yield the slug used as the natural key
 * (`isSourceKey` field). Mirrors what Postgres sees as `source_name` /
 * `name` — same value across re-ingestions of the same file is what
 * makes replace-by-source idempotent.
 */
export function defaultSourceName(documentName: string | null): string {
  if (!documentName) return "";
  const dot = documentName.lastIndexOf(".");
  return dot > 0 ? documentName.slice(0, dot) : documentName;
}

/**
 * Best-effort docType inference: scans the filename for any of the
 * field's option values as a substring, accent + case insensitive, so
 * a glued slug like `AUTORIZACIÓNMUTUAMINUTA.docx` still resolves to
 * `minuta`. Longest option wins on overlap (e.g. `subdemanda` beats
 * `demanda`). Returns "" when nothing matches; the caller decides
 * whether to fall back to the field's `defaultValue`.
 */
export function defaultDocType(
  fileName: string,
  options: readonly DocumentFieldOption[],
): string {
  const haystack = normalize(fileName);
  const sorted = [...options].sort(
    (a, b) => b.value.length - a.value.length,
  );
  for (const opt of sorted) {
    if (haystack.includes(normalize(opt.value))) return opt.value;
  }
  return "";
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Pre-fill values for a profile's documentFields against a single file.
 *
 *   isSourceKey      → defaultSourceName(filename)
 *   isTitleKey       → fileNameToTemplateTitle(filename)  (operator-editable)
 *   docType (select) → defaultDocType(filename, options) || defaultValue
 *   defaultValue     → as-declared in the profile
 *   else             → "" (operator must fill before isFormReady passes)
 *
 * Pure: same inputs always produce the same output. Both the single-doc
 * IngestDialog and the batch Index-all flow build their starting values
 * through here so the two stay aligned.
 */
export function initialValuesForProfile(
  profile: SchemaProfile,
  documentName: string | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of profile.documentFields) {
    if (field.isSourceKey) {
      out[field.key] = defaultSourceName(documentName);
    } else if (field.isTitleKey) {
      out[field.key] = documentName
        ? fileNameToTemplateTitle(documentName)
        : "";
    } else if (
      field.key === "docType" &&
      field.kind === "select" &&
      field.options &&
      documentName
    ) {
      out[field.key] =
        defaultDocType(documentName, field.options) ||
        field.defaultValue ||
        "";
    } else if (field.defaultValue !== undefined) {
      out[field.key] = field.defaultValue;
    } else {
      out[field.key] = "";
    }
  }
  return out;
}

/**
 * True when every required field has a non-blank value. Shared between
 * the IngestDialog footer (gates the Start button) and the batch flow
 * (decides whether to skip a doc with a clear error).
 */
export function isFormReady(
  profile: SchemaProfile | null,
  values: Record<string, string>,
): boolean {
  if (!profile) return false;
  for (const f of profile.documentFields) {
    if (f.required && (!values[f.key] || values[f.key].trim() === "")) return false;
  }
  return true;
}
