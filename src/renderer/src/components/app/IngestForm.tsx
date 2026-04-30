import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { useT } from "@/lib/i18n";
import type { DocumentField, SchemaProfile } from "@shared/types";

export interface IngestFormProps {
  profile: SchemaProfile | null;
  profiles: SchemaProfile[];
  onSelectProfile: (id: string) => void;
  values: Record<string, string>;
  onChangeValue: (key: string, value: string) => void;
  chunkCount: number;
  estimatedCostUsd: number;
}

export function IngestForm({
  profile,
  profiles,
  onSelectProfile,
  values,
  onChangeValue,
  chunkCount,
  estimatedCostUsd,
}: IngestFormProps) {
  const t = useT();
  return (
    <>
      <Field label={t("ingest.profileLabel")} hint={t("ingest.profileHint")}>
        <Select
          value={profile?.id ?? ""}
          onChange={(e) => onSelectProfile(e.target.value)}
        >
          {profiles.length === 0 && (
            <option value="" disabled>
              {t("ingest.noProfiles")}
            </option>
          )}
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      {profile?.description && (
        <p className="-mt-2 text-[11px] text-muted-foreground">{profile.description}</p>
      )}

      {profile?.documentFields.map((field) => (
        <DynamicField
          key={field.key}
          field={field}
          value={values[field.key] ?? ""}
          onChange={(v) => onChangeValue(field.key, v)}
        />
      ))}

      <ReadyLine
        profile={profile}
        chunkCount={chunkCount}
        estimatedCostUsd={estimatedCostUsd}
      />
    </>
  );
}

function DynamicField({
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
      <Field label={field.label} hint={field.hint}>
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          {!field.required && <option value=""></option>}
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  return (
    <Field label={field.label} hint={field.hint}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function ReadyLine({
  profile,
  chunkCount,
  estimatedCostUsd,
}: {
  profile: SchemaProfile | null;
  chunkCount: number;
  estimatedCostUsd: number;
}) {
  const t = useT();
  if (!profile) return null;
  const isOpenAi = profile.embedding.providerId === "openai";
  return (
    <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
      {isOpenAi
        ? t("ingest.ready", {
            count: chunkCount,
            cost: estimatedCostUsd.toFixed(4),
          })
        : t("ingest.readyLocal", {
            count: chunkCount,
            model: profile.embedding.model,
          })}
    </p>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
