import { fileNameToTemplateTitle } from "@/lib/fileNameToTemplateTitle";
import type { SchemaProfile } from "@shared/types";

/**
 * Strip the file extension to yield the slug used as the natural key
 * (`isSourceKey` field). Mirrors what Postgres sees as `source_name` /
 * `template_name` — same value across re-ingestions of the same file
 * is what makes replace-by-source idempotent.
 */
export function defaultSourceName(documentName: string | null): string {
  if (!documentName) return "";
  const dot = documentName.lastIndexOf(".");
  return dot > 0 ? documentName.slice(0, dot) : documentName;
}

/**
 * Pre-fill values for a profile's documentFields against a single file.
 *
 *   isSourceKey   → defaultSourceName(filename)
 *   isTitleKey    → fileNameToTemplateTitle(filename)  (operator-editable)
 *   defaultValue  → as-declared in the profile
 *   else          → "" (operator must fill before isFormReady passes)
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
