import { useEffect, useMemo, useState } from "react";
import { chunkerClient } from "@/services/chunker-client";
import type { SchemaProfile } from "@shared/types";

function defaultSourceName(documentName: string | null): string {
  if (!documentName) return "";
  const dot = documentName.lastIndexOf(".");
  return dot > 0 ? documentName.slice(0, dot) : documentName;
}

function initialValuesForProfile(
  profile: SchemaProfile,
  documentName: string | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of profile.documentFields) {
    if (field.isSourceKey) {
      out[field.key] = defaultSourceName(documentName);
    } else if (field.defaultValue !== undefined) {
      out[field.key] = field.defaultValue;
    } else {
      out[field.key] = "";
    }
  }
  return out;
}

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

export interface IngestProfileState {
  profiles: SchemaProfile[];
  profile: SchemaProfile | null;
  values: Record<string, string>;
  loadError: string | null;
  selectProfile: (id: string) => void;
  changeValue: (key: string, value: string) => void;
}

/**
 * Loads profiles when `active` flips true and seeds the form values
 * from the chosen profile. Resets when the dialog reopens for a
 * different document.
 */
export function useIngestProfileState(
  active: boolean,
  documentName: string | null,
): IngestProfileState {
  const [profiles, setProfiles] = useState<SchemaProfile[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setLoadError(null);
    chunkerClient
      .readConfig()
      .then((config) => {
        setProfiles(config.profiles);
        const initialId = config.defaultProfileId ?? config.profiles[0]?.id ?? null;
        setProfileId(initialId);
        const seedProfile = config.profiles.find((p) => p.id === initialId);
        setValues(seedProfile ? initialValuesForProfile(seedProfile, documentName) : {});
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : String(err));
      });
  }, [active, documentName]);

  const profile = useMemo(
    () => profiles.find((p) => p.id === profileId) ?? null,
    [profiles, profileId],
  );

  const selectProfile = (id: string) => {
    setProfileId(id);
    const next = profiles.find((p) => p.id === id);
    setValues(next ? initialValuesForProfile(next, documentName) : {});
  };

  const changeValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return { profiles, profile, values, loadError, selectProfile, changeValue };
}
