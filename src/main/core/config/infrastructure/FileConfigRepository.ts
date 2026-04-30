import { app } from "electron";
import { promises as fs } from "fs";
import { join } from "path";
import { injectable } from "inversify";
import type { ConfigRepository } from "../domain/ConfigRepository";
import { DEFAULT_PROFILES, EMPTY_CONFIG } from "../domain/ConfigEntities";
import type { AppConfig, SchemaProfile } from "../../../../shared/types";

const FILENAME = "config.json";

/**
 * JSON-on-disk store for user-supplied secrets and schema profiles.
 * Lives under Electron's `userData` directory which is per-OS-user
 * and not synced anywhere.
 *
 * Caveat: secrets are stored unencrypted. For a production tool we'd
 * use Electron's `safeStorage`, but that's out of scope for the MVP —
 * the file is mode 0600 to at least block other local users.
 *
 * Backwards compat: pre-profiles config files are missing the
 * `profiles`/`defaultProfileId`/`ollamaUrl` keys; the read path seeds
 * them from `DEFAULT_PROFILES` so existing installs upgrade cleanly.
 */
@injectable()
export class FileConfigRepository implements ConfigRepository {
  private get filePath(): string {
    return join(app.getPath("userData"), FILENAME);
  }

  async read(): Promise<AppConfig> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return normalize(parsed);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_CONFIG;
      throw err;
    }
  }

  async write(next: AppConfig): Promise<AppConfig> {
    const sanitized = normalize(next);
    const payload = JSON.stringify(sanitized, null, 2);
    await fs.writeFile(this.filePath, payload, { mode: 0o600 });
    return sanitized;
  }
}

function normalize(input: Partial<AppConfig>): AppConfig {
  const profiles = sanitizeProfiles(input.profiles);
  const defaultProfileId = pickDefaultProfileId(input.defaultProfileId, profiles);
  return {
    openaiApiKey: input.openaiApiKey?.trim() || null,
    databaseUrl: input.databaseUrl?.trim() || null,
    ollamaUrl: input.ollamaUrl?.trim() || null,
    profiles,
    defaultProfileId,
  };
}

function sanitizeProfiles(input: SchemaProfile[] | undefined): SchemaProfile[] {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_PROFILES;
  // Strip nothing here — assume the editor has validated. We only enforce
  // shape stability so a malformed file doesn't crash the app.
  return input
    .filter((p): p is SchemaProfile => !!p && typeof p.id === "string" && typeof p.table === "string")
    .map((p) => ({
      ...p,
      documentFields: Array.isArray(p.documentFields) ? p.documentFields : [],
    }));
}

function pickDefaultProfileId(
  candidate: string | null | undefined,
  profiles: SchemaProfile[],
): string | null {
  if (candidate && profiles.some((p) => p.id === candidate)) return candidate;
  return profiles[0]?.id ?? null;
}
