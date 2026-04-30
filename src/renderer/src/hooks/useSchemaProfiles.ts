import { useEffect, useState, useCallback } from "react";
import { chunkerClient } from "@/services/chunker-client";
import type { AppConfig, SchemaProfile } from "@shared/types";

export interface SchemaProfilesState {
  profiles: SchemaProfile[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /**
   * Persist a single profile (insert or update by id). Returns the
   * resulting profile list so callers can refresh local state.
   */
  saveProfile: (profile: SchemaProfile) => Promise<SchemaProfile[]>;
  /** Delete by id; refuses to delete built-in profiles. */
  deleteProfile: (id: string) => Promise<SchemaProfile[]>;
}

/**
 * Reads/writes profiles via the existing config IPC. State is kept
 * local; the IngestDialog (which also reads profiles) loads its own
 * snapshot when it opens, so we don't need a shared store.
 */
export function useSchemaProfiles(active: boolean): SchemaProfilesState {
  const [profiles, setProfiles] = useState<SchemaProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await chunkerClient.readConfig();
      setProfiles(config.profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void reload();
  }, [active, reload]);

  const saveProfile = useCallback(
    async (profile: SchemaProfile): Promise<SchemaProfile[]> => {
      const config = await chunkerClient.readConfig();
      const next = upsertProfile(config, profile);
      const written = await chunkerClient.writeConfig(next);
      setProfiles(written.profiles);
      return written.profiles;
    },
    [],
  );

  const deleteProfile = useCallback(
    async (id: string): Promise<SchemaProfile[]> => {
      const config = await chunkerClient.readConfig();
      const target = config.profiles.find((p) => p.id === id);
      if (!target) return config.profiles;
      if (target.builtIn) {
        throw new Error("Built-in profiles cannot be deleted.");
      }
      const filteredProfiles = config.profiles.filter((p) => p.id !== id);
      const next: AppConfig = {
        ...config,
        profiles: filteredProfiles,
        defaultProfileId:
          config.defaultProfileId === id
            ? (filteredProfiles[0]?.id ?? null)
            : config.defaultProfileId,
      };
      const written = await chunkerClient.writeConfig(next);
      setProfiles(written.profiles);
      return written.profiles;
    },
    [],
  );

  return { profiles, loading, error, reload, saveProfile, deleteProfile };
}

function upsertProfile(config: AppConfig, profile: SchemaProfile): AppConfig {
  const idx = config.profiles.findIndex((p) => p.id === profile.id);
  const next =
    idx === -1
      ? [...config.profiles, profile]
      : config.profiles.map((p, i) => (i === idx ? profile : p));
  return { ...config, profiles: next };
}
