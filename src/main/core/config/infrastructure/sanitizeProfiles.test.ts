import { describe, expect, it, vi } from "vitest";

// FileConfigRepository imports from "electron" at module load time;
// stub it so this test (which only touches the pure helper) can run
// in plain Node. The shape needed by the helper itself is empty —
// safeStorage / app are only used by the I/O methods.
vi.mock("electron", () => ({
  app: { getPath: () => "/tmp" },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (s: string) => Buffer.from(s),
    decryptString: (b: Buffer) => b.toString(),
  },
}));

import { sanitizeProfiles } from "./FileConfigRepository";
import { DEFAULT_PROFILES } from "../domain/ConfigEntities";
import type { SchemaProfile } from "../../../../shared/types";

const userProfile = (
  overrides: Partial<SchemaProfile> = {},
): SchemaProfile => ({
  id: "custom-1",
  name: "My profile",
  description: "",
  table: "my_table",
  textColumn: "text",
  embeddingColumn: "embedding",
  articleColumn: null,
  headingColumn: null,
  documentFields: [],
  chunking: "articleAware",
  embedding: { providerId: "openai", model: "x", dimensions: 1536 },
  ...overrides,
});

describe("sanitizeProfiles", () => {
  it("returns DEFAULT_PROFILES when input is missing or empty", () => {
    expect(sanitizeProfiles(undefined)).toEqual(DEFAULT_PROFILES);
    expect(sanitizeProfiles([])).toEqual(DEFAULT_PROFILES);
  });

  it("force-refreshes built-in profiles to the current DEFAULT_PROFILES copy", () => {
    // Simulate an on-disk profile that drifted from the bundled
    // default — exactly the bug that caused the "column heading does
    // not exist" report. The stale shape must NOT survive past read.
    const stale: SchemaProfile = {
      ...DEFAULT_PROFILES.find((p) => p.id === "legal-skeletons")!,
      headingColumn: "heading", // stale column the skeletons table doesn't have
      bodyColumn: "body",       // stale; current profile maps body to source_body
    };
    const out = sanitizeProfiles([stale]);
    const refreshed = out.find((p) => p.id === "legal-skeletons")!;
    const fresh = DEFAULT_PROFILES.find((p) => p.id === "legal-skeletons")!;
    expect(refreshed).toEqual(fresh);
    expect(refreshed.headingColumn).toBeNull();
    expect(refreshed.bodyColumn).toBe("source_body");
  });

  it("leaves user-added profiles (no builtIn flag) verbatim", () => {
    const custom = userProfile({ table: "custom_t" });
    const out = sanitizeProfiles([custom]);
    expect(out.find((p) => p.id === "custom-1")).toMatchObject({
      table: "custom_t",
    });
  });

  it("appends bundled profiles the on-disk file is missing entirely", () => {
    // Operator only has a custom profile saved — bundled profiles
    // should still be present so the IngestDialog can offer them.
    const out = sanitizeProfiles([userProfile()]);
    for (const def of DEFAULT_PROFILES) {
      expect(out.some((p) => p.id === def.id)).toBe(true);
    }
  });

  it("treats a builtIn-flagged profile with no matching default as user-owned", () => {
    // Defensive: the operator removed a profile from DEFAULT_PROFILES
    // but the on-disk row still claims builtIn=true. Don't drop it
    // (their data) — just normalize it through the user-profile path.
    const orphan: SchemaProfile = {
      ...userProfile({ id: "removed-from-defaults" }),
      builtIn: true,
    };
    const out = sanitizeProfiles([orphan]);
    expect(out.some((p) => p.id === "removed-from-defaults")).toBe(true);
  });

  it("filters out structurally invalid rows (missing id or table)", () => {
    const malformed = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: 42 } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { table: "x" } as any,
    ];
    const out = sanitizeProfiles(malformed);
    // Defaults still appear via the missing-builtins backfill.
    for (const def of DEFAULT_PROFILES) {
      expect(out.some((p) => p.id === def.id)).toBe(true);
    }
    // No row from the malformed input survives.
    expect(out.every((p) => p.id !== "42" && p.id !== "x")).toBe(true);
  });

  it("normalizes documentFields to an array on user profiles missing the field", () => {
    const broken = userProfile();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (broken as any).documentFields;
    const out = sanitizeProfiles([broken]);
    const restored = out.find((p) => p.id === "custom-1")!;
    expect(Array.isArray(restored.documentFields)).toBe(true);
  });
});
