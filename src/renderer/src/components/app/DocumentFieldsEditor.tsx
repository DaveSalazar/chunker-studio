import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useT } from "@/lib/i18n";
import type { DocumentField } from "@shared/types";

export interface DocumentFieldsEditorProps {
  fields: DocumentField[];
  onChange: (next: DocumentField[]) => void;
}

/**
 * Lists the profile's documentFields and lets the operator rename the
 * DB column behind each one. Field key, kind, and options are
 * read-only in v1 — those are structural decisions baked into the
 * profile shape.
 */
export function DocumentFieldsEditor({ fields, onChange }: DocumentFieldsEditorProps) {
  const t = useT();
  const updateColumn = (idx: number, column: string) => {
    onChange(fields.map((f, i) => (i === idx ? { ...f, column } : f)));
  };
  return (
    <div className="flex flex-col gap-2">
      <Label>{t("schemas.documentFields")}</Label>
      <p className="text-[11px] text-muted-foreground">
        {t("schemas.documentFieldsHint")}
      </p>
      <div className="flex flex-col gap-2 rounded-md border border-border p-3">
        {fields.map((field, idx) => (
          <FieldRow
            key={field.key}
            field={field}
            onChangeColumn={(c) => updateColumn(idx, c)}
          />
        ))}
        {fields.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            {t("schemas.noDocumentFields")}
          </p>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  onChangeColumn,
}: {
  field: DocumentField;
  onChangeColumn: (column: string) => void;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-[140px_1fr_auto] items-center gap-2 text-xs">
      <span className="truncate font-medium" title={field.label}>
        {field.label}
      </span>
      <Input
        value={field.column}
        onChange={(e) => onChangeColumn(e.target.value)}
        placeholder="snake_case_column"
        className="font-mono text-[11px]"
      />
      <span className="text-[10px] text-muted-foreground">
        {field.isSourceKey ? t("schemas.sourceKeyTag") : field.kind}
      </span>
    </div>
  );
}
