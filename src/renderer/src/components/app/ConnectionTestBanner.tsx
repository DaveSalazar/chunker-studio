import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";

export type ConnectionTestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; version: string; durationMs: number }
  | { kind: "error"; message: string };

export interface ConnectionTestBannerProps {
  state: ConnectionTestState;
}

export function ConnectionTestBanner({ state }: ConnectionTestBannerProps) {
  const t = useT();
  if (state.kind === "idle") return null;

  if (state.kind === "testing") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        {t("preferences.testing")}
      </div>
    );
  }

  if (state.kind === "ok") {
    return (
      <div className="flex flex-col gap-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-300">
        <span className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("preferences.testOk", { durationMs: state.durationMs })}
        </span>
        <span className="truncate font-mono text-emerald-200/70" title={state.version}>
          {state.version}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
      <span className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t("preferences.testFailed")}
      </span>
      <span className="break-all font-mono text-destructive/90">{state.message}</span>
    </div>
  );
}
