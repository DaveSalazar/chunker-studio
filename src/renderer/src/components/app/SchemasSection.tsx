import { useEffect, useMemo, useState } from "react";
import { CopyPlus, Database } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DialogSection } from "@/components/app/DialogSection";
import { ProfileEditor } from "@/components/app/ProfileEditor";
import { useSchemaProfiles } from "@/hooks/useSchemaProfiles";
import { useT } from "@/lib/i18n";
import { chunkerClient } from "@/services/chunker-client";
import type { SchemaProfile } from "@shared/types";

export interface SchemasSectionProps {
  active: boolean;
}

/**
 * "Schemas" section of the Settings dialog. Hosts the profile picker,
 * a duplicate-as-new button, and the per-profile editor. State is
 * loaded fresh whenever the dialog opens (`active` flips true).
 */
export function SchemasSection({ active }: SchemasSectionProps) {
  const t = useT();
  const { profiles, error, reload, saveProfile, deleteProfile } =
    useSchemaProfiles(active);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState<string | null>(null);

  // Load the Ollama URL alongside profiles so EmbeddingPinEditor can
  // call /api/tags against the right base URL.
  useEffect(() => {
    if (!active) return;
    chunkerClient
      .readConfig()
      .then((config) => setOllamaUrl(config.ollamaUrl))
      .catch(() => setOllamaUrl(null));
  }, [active]);

  // Default-select the first profile once they load.
  useEffect(() => {
    if (!selectedId && profiles.length > 0) setSelectedId(profiles[0].id);
  }, [profiles, selectedId]);

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  const duplicate = async () => {
    if (!selected) return;
    const copy: SchemaProfile = {
      ...selected,
      id: `${selected.id}-copy-${Date.now().toString(36)}`,
      name: `${selected.name} (copy)`,
      builtIn: false,
    };
    const next = await saveProfile(copy);
    const created = next.find((p) => p.id === copy.id);
    if (created) setSelectedId(created.id);
  };

  const handleSave = async (profile: SchemaProfile) => {
    await saveProfile(profile);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteProfile(selected.id);
    await reload();
    setSelectedId(null);
  };

  return (
    <DialogSection
      icon={<Database className="h-4 w-4 text-primary" />}
      title={t("schemas.sectionTitle")}
      description={t("schemas.sectionDescription")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.builtIn ? " · built-in" : ""}
                </option>
              ))}
              {profiles.length === 0 && <option value="">{t("schemas.empty")}</option>}
            </Select>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={duplicate}
            disabled={!selected}
            title={t("schemas.duplicateTitle")}
          >
            <CopyPlus className="h-3.5 w-3.5" />
            {t("schemas.duplicate")}
          </Button>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {selected && (
          <ProfileEditor
            profile={selected}
            ollamaUrl={ollamaUrl}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </div>
    </DialogSection>
  );
}
