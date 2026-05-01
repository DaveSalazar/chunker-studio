import { app, safeStorage } from "electron";
import { promises as fs } from "fs";
import { join } from "path";
import { injectable } from "inversify";
import type { ConfigRepository } from "../domain/ConfigRepository";
import { DEFAULT_PROFILES, EMPTY_CONFIG } from "../domain/ConfigEntities";
import type { AppConfig, SchemaProfile } from "../../../../shared/types";

const FILENAME = "config.json";
/**
 * Marker prefix on encrypted strings. A plaintext value (e.g. read from
 * a pre-encryption config or written on a system without keychain
 * support) won't carry it, so we can distinguish encrypted from
 * plaintext at decrypt time.
 */
const ENCRYPTION_PREFIX = "enc:v1:";

/**
 * JSON-on-disk store for user-supplied secrets and schema profiles.
 * Lives under Electron's `userData` directory which is per-OS-user
 * and not synced anywhere.
 *
 * Secrets (`openaiApiKey`, `databaseUrl`) are encrypted at rest with
 * Electron's `safeStorage` — Keychain on macOS, DPAPI on Windows,
 * libsecret on Linux. On systems where `safeStorage` reports no
 * encryption available (some headless Linux setups), they fall back
 * to plaintext with a console warning. The on-disk file is mode 0600
 * either way.
 *
 * Backwards compat: pre-profiles config files are missing the
 * `profiles`/`defaultProfileId`/`ollamaUrl` keys; the read path seeds
 * them from `DEFAULT_PROFILES` so existing installs upgrade cleanly.
 * Pre-encryption config files contain plaintext secrets — they decode
 * cleanly through `decryptIfNeeded` and get re-encrypted on next save.
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
      return normalize({
        ...parsed,
        openaiApiKey: decryptIfNeeded(parsed.openaiApiKey ?? null),
        databaseUrl: decryptIfNeeded(parsed.databaseUrl ?? null),
      });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_CONFIG;
      throw err;
    }
  }

  async write(next: AppConfig): Promise<AppConfig> {
    const sanitized = normalize(next);
    const payload = JSON.stringify(
      {
        ...sanitized,
        openaiApiKey: encryptIfPossible(sanitized.openaiApiKey),
        databaseUrl: encryptIfPossible(sanitized.databaseUrl),
      },
      null,
      2,
    );
    await fs.writeFile(this.filePath, payload, { mode: 0o600 });
    return sanitized;
  }
}

function encryptIfPossible(value: string | null): string | null {
  if (value === null) return null;
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn(
      "[config] safeStorage unavailable — secret stored as plaintext",
    );
    return value;
  }
  const buf = safeStorage.encryptString(value);
  return ENCRYPTION_PREFIX + buf.toString("base64");
}

function decryptIfNeeded(value: string | null): string | null {
  if (value === null) return null;
  if (!value.startsWith(ENCRYPTION_PREFIX)) return value;
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn(
      "[config] encrypted secret found but safeStorage is unavailable; cannot decrypt",
    );
    return null;
  }
  try {
    const buf = Buffer.from(value.slice(ENCRYPTION_PREFIX.length), "base64");
    return safeStorage.decryptString(buf);
  } catch (err) {
    console.error("[config] failed to decrypt secret", err);
    return null;
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
