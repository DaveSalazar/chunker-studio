import { AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { useT } from "@/lib/i18n";
import type { SchemaProfile } from "@shared/types";

export interface IndexAllIdleBodyProps {
  profile: SchemaProfile | null;
  profiles: SchemaProfile[];
  onSelectProfile: (id: string) => void;
  documentCount: number;
  /** When non-null, render the "this body is large" warning with this token count. */
  heavyTokens: number | null;
  loadError: string | null;
}

/**
 * Pre-run body of the Index-all dialog: profile picker + heavy-template
 * warning + ready-to-go count. Pulled out of IndexAllDialog so the
 * dialog stays under the project's 180-line component cap.
 */
export function IndexAllIdleBody({
  profile,
  profiles,
  onSelectProfile,
  documentCount,
  heavyTokens,
  loadError,
}: IndexAllIdleBodyProps) {
  const t = useT();
  if (loadError) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        {loadError}
      </p>
    );
  }
  return (
    <>
      {heavyTokens !== null && (
        <p className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            {t("indexAll.bodyTokenWarning", {
              tokens: heavyTokens.toLocaleString(),
            })}
          </span>
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label>{t("ingest.profileLabel")}</Label>
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
        <p className="text-[11px] text-muted-foreground">
          {t("ingest.profileHint")}
        </p>
      </div>
      <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        {t("indexAll.ready", { count: documentCount })}
      </p>
    </>
  );
}
