import { useEffect, useMemo, useState } from "react";
import { chunkerClient } from "@/services/chunker-client";
import type { SchemaProfile } from "@shared/types";

export interface ProfileChoice {
  profile: SchemaProfile | null;
  profiles: SchemaProfile[];
  loadError: string | null;
  selectProfile: (id: string) => void;
}

/**
 * Loads the user's saved AppConfig and exposes the active schema
 * profile (defaulting to `defaultProfileId` or the first one) plus a
 * setter for picking a different one. Used by the Index-all dialog
 * where there's no per-doc form — only a profile choice.
 *
 * Re-loads each time `active` flips true so a config edit between
 * dialog opens is picked up without an app restart.
 */
export function useProfileChoice(active: boolean): ProfileChoice {
  const [profiles, setProfiles] = useState<SchemaProfile[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setLoadError(null);
    chunkerClient
      .readConfig()
      .then((c) => {
        setProfiles(c.profiles);
        setProfileId(c.defaultProfileId ?? c.profiles[0]?.id ?? null);
      })
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : String(err)),
      );
  }, [active]);

  const profile = useMemo(
    () => profiles.find((p) => p.id === profileId) ?? null,
    [profiles, profileId],
  );

  return { profile, profiles, loadError, selectProfile: setProfileId };
}
