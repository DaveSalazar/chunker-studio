import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Segmented } from "@/components/ui/Segmented";
import { DocumentFieldsEditor } from "@/components/app/DocumentFieldsEditor";
import { EmbeddingPinEditor } from "@/components/app/EmbeddingPinEditor";
import { useT } from "@/lib/i18n";
import type { ChunkingStrategyId, SchemaProfile } from "@shared/types";

export interface ProfileEditorProps {
  profile: SchemaProfile;
  ollamaUrl: string | null;
  onSave: (next: SchemaProfile) => Promise<void>;
  onDelete: () => Promise<void>;
}

/**
 * Form for one profile. Local "draft" state lets the operator try
 * edits before committing — saves are explicit. Built-in profiles
 * can be edited but not deleted.
 */
export function ProfileEditor({
  profile,
  ollamaUrl,
  onSave,
  onDelete,
}: ProfileEditorProps) {
  const t = useT();
  const [draft, setDraft] = useState<SchemaProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset draft when the operator picks a different profile.
  useEffect(() => {
    setDraft(profile);
    setError(null);
    setSavedFlash(false);
  }, [profile]);

  const update = (patch: Partial<SchemaProfile>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("schemas.profileName")}>
          <Input
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </Field>
        <Field label={t("schemas.targetTable")}>
          <Input
            value={draft.table}
            onChange={(e) => update({ table: e.target.value })}
            className="font-mono text-xs"
          />
        </Field>
      </div>
      <Field label={t("schemas.profileDescription")}>
        <Input
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("schemas.textColumn")}>
          <Input
            value={draft.textColumn}
            onChange={(e) => update({ textColumn: e.target.value })}
            className="font-mono text-xs"
          />
        </Field>
        <Field label={t("schemas.embeddingColumn")}>
          <Input
            value={draft.embeddingColumn}
            onChange={(e) => update({ embeddingColumn: e.target.value })}
            className="font-mono text-xs"
          />
        </Field>
        <Field label={t("schemas.articleColumn")}>
          <Input
            value={draft.articleColumn ?? ""}
            placeholder={t("schemas.optionalColumn")}
            onChange={(e) =>
              update({ articleColumn: e.target.value.trim() || null })
            }
            className="font-mono text-xs"
          />
        </Field>
        <Field label={t("schemas.headingColumn")}>
          <Input
            value={draft.headingColumn ?? ""}
            placeholder={t("schemas.optionalColumn")}
            onChange={(e) =>
              update({ headingColumn: e.target.value.trim() || null })
            }
            className="font-mono text-xs"
          />
        </Field>
      </div>

      <Field label={t("schemas.chunkingStrategy")}>
        <Segmented<ChunkingStrategyId>
          value={draft.chunking}
          onChange={(chunking) => update({ chunking })}
          options={[
            { value: "articleAware", label: t("schemas.chunkingArticle") },
            { value: "paragraph", label: t("schemas.chunkingParagraph") },
          ]}
          className="w-full justify-stretch [&>button]:flex-1"
        />
      </Field>

      <EmbeddingPinEditor
        value={draft.embedding}
        onChange={(embedding) => update({ embedding })}
        ollamaUrl={ollamaUrl}
      />

      <DocumentFieldsEditor
        fields={draft.documentFields}
        onChange={(documentFields) => update({ documentFields })}
      />

      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        {error && <span className="mr-auto text-[11px] text-destructive">{error}</span>}
        {savedFlash && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("schemas.saved")}
          </span>
        )}
        {!profile.builtIn && (
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={saving}>
            <Trash2 className="h-3.5 w-3.5" />
            {t("schemas.delete")}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {t("schemas.save")}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
