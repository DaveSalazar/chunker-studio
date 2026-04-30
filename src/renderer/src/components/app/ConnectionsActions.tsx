import { CheckCircle2, Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import type { ConnectionTestState } from "@/components/app/ConnectionTestBanner";

export interface ConnectionsActionsProps {
  savingState: "idle" | "saving" | "saved";
  testState: ConnectionTestState;
  databaseUrl: string;
  error: string | null;
  onTest: () => void;
  onSave: () => void;
}

export function ConnectionsActions({
  savingState,
  testState,
  databaseUrl,
  error,
  onTest,
  onSave,
}: ConnectionsActionsProps) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <span className="mr-auto text-[11px] text-destructive">{error}</span>
      )}
      {savingState === "saved" && (
        <span className="flex items-center gap-1 text-[11px] text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("preferences.saved")}
        </span>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={onTest}
        disabled={testState.kind === "testing" || databaseUrl.trim().length === 0}
      >
        {testState.kind === "testing" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <PlugZap />
        )}
        {testState.kind === "testing"
          ? t("preferences.testing")
          : t("preferences.testConnection")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onSave}
        disabled={savingState === "saving"}
      >
        {t("preferences.save")}
      </Button>
    </div>
  );
}
