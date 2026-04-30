import { FileText, Files, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useT } from "@/lib/i18n";
import type { SettingsScope } from "@/hooks/useChunkerSession";

export interface SettingsScopeBarProps {
  scope: SettingsScope;
  onScopeChange: (next: SettingsScope) => void;
  activeDocumentName?: string;
  hasOverride: boolean;
  onClearOverride?: () => void;
}

export function SettingsScopeBar({
  scope,
  onScopeChange,
  activeDocumentName,
  hasOverride,
  onClearOverride,
}: SettingsScopeBarProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2">
      <Segmented
        value={scope}
        onChange={onScopeChange}
        options={[
          {
            value: "global",
            label: (
              <>
                <Files className="h-3 w-3" /> {t("settings.scopeAll")}
              </>
            ),
            hint: t("settings.scopeAllHint"),
          },
          {
            value: "perDocument",
            label: (
              <>
                <FileText className="h-3 w-3" /> {t("settings.scopeThis")}
              </>
            ),
            hint: t("settings.scopeThisHint"),
          },
        ]}
        className="w-full justify-stretch [&>button]:flex-1"
      />
      <ScopeHint
        scope={scope}
        activeDocumentName={activeDocumentName}
        hasOverride={hasOverride}
        onClearOverride={onClearOverride}
      />
    </div>
  );
}

function ScopeHint({
  scope,
  activeDocumentName,
  hasOverride,
  onClearOverride,
}: {
  scope: SettingsScope;
  activeDocumentName?: string;
  hasOverride: boolean;
  onClearOverride?: () => void;
}) {
  const t = useT();
  if (scope === "global") {
    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t("settings.scopeAllExplain")}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t("settings.scopeThisEditing")}
        {activeDocumentName ? (
          <span className="ml-1 font-mono text-foreground/80">{activeDocumentName}</span>
        ) : (
          ` ${t("settings.scopeThisActiveDocument")}`
        )}{" "}
        {t("settings.scopeThisOnlySuffix")}
      </p>
      {hasOverride ? (
        <Badge variant="default" className="gap-1">
          {t("settings.overrideBadge")}
          {onClearOverride && (
            <button
              type="button"
              onClick={onClearOverride}
              className="-mr-1 ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-primary/20"
              aria-label={t("settings.resetTitle")}
              title={t("settings.resetTitle")}
            >
              <Undo2 className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ) : (
        <Badge variant="muted">{t("settings.inheriting")}</Badge>
      )}
      {hasOverride && onClearOverride && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearOverride}
          className="h-6 px-2 text-[11px]"
        >
          <Undo2 className="h-3 w-3" />
          {t("settings.reset")}
        </Button>
      )}
    </div>
  );
}
