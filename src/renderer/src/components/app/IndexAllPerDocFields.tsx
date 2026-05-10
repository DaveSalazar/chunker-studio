import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { useT } from "@/lib/i18n";
import type { DocumentField, SchemaProfile } from "@shared/types";
import type { IndexableDocument } from "@/hooks/session/types";

export interface IndexAllPerDocFieldsProps {
  profile: SchemaProfile;
  documents: IndexableDocument[];
  valuesByDoc: Record<string, Record<string, string>>;
  onChangeValue: (docId: string, fieldKey: string, value: string) => void;
}

/**
 * Per-document editor surfaced before a batch run. Mirrors the single-
 * doc IngestForm: every profile field (including the natural-key
 * `isSourceKey` field) is editable so the operator can rename a source
 * or pick a different type per file without dropping out of the batch
 * flow. For `legal-references` this surfaces `sourceName` (the human
 * label like "Código Civil"); for `legal-skeletons` it surfaces
 * `name`, `title`, and `docType`.
 *
 * Caveat: editing `isSourceKey` to a value that collides with another
 * file in the same batch will cause the later ingest to wipe the
 * earlier one (replace-by-source DELETEs by that key). Defaults are
 * derived from filenames, which are unique by construction, so the
 * collision only happens if the operator types a duplicate manually.
 *
 * Stateless. Owns no values; the parent dialog holds `valuesByDoc` so
 * one re-seed (on profile change) can clear every doc's overrides.
 */
export function IndexAllPerDocFields({
  profile,
  documents,
  valuesByDoc,
  onChangeValue,
}: IndexAllPerDocFieldsProps) {
  const t = useT();
  const editableFields = profile.documentFields;
  if (editableFields.length === 0 || documents.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{t("indexAll.perDocHeading")}</Label>
      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        <table className="w-full table-fixed text-xs">
          <thead className="sticky top-0 z-10 bg-secondary text-[11px] uppercase tracking-wide text-muted-foreground shadow-[0_1px_0_0_var(--border)]">
            <tr>
              <th className="w-[28%] px-2 py-1.5 text-left font-medium">
                {t("indexAll.perDocFilenameLabel")}
              </th>
              {editableFields.map((field) => (
                <th
                  key={field.key}
                  className="px-2 py-1.5 text-left font-medium"
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="border-t border-border/60 align-top"
              >
                <td
                  className="truncate px-2 py-1.5 font-mono text-[11px] text-muted-foreground"
                  title={doc.fileName}
                >
                  {doc.fileName}
                </td>
                {editableFields.map((field) => (
                  <td key={field.key} className="px-1.5 py-1">
                    <DocFieldControl
                      field={field}
                      value={valuesByDoc[doc.id]?.[field.key] ?? ""}
                      onChange={(v) => onChangeValue(doc.id, field.key, v)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocFieldControl({
  field,
  value,
  onChange,
}: {
  field: DocumentField;
  value: string;
  onChange: (next: string) => void;
}) {
  if (field.kind === "select") {
    return (
      <Select
        className="h-8 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {!field.required && <option value=""></option>}
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <Input
      className="h-8 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
