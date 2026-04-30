import { useEffect, useState } from "react";
import { Plug } from "lucide-react";
import { ConnectionsActions } from "@/components/app/ConnectionsActions";
import { ConnectionsFields } from "@/components/app/ConnectionsFields";
import {
  ConnectionTestBanner,
  type ConnectionTestState,
} from "@/components/app/ConnectionTestBanner";
import { DialogSection } from "@/components/app/DialogSection";
import { useT } from "@/lib/i18n";
import { chunkerClient } from "@/services/chunker-client";
import type { AppConfig } from "@shared/types";

export interface ConnectionsSectionProps {
  /** Set to true when the parent dialog opens — triggers a config reload. */
  active: boolean;
}

/**
 * Owns the OpenAI key + Postgres URL + Ollama URL form. State is local
 * because no other component cares about the in-flight values; saved
 * values live in the on-disk config and are re-read each time the
 * dialog opens.
 */
export function ConnectionsSection({ active }: ConnectionsSectionProps) {
  const t = useT();
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [testState, setTestState] = useState<ConnectionTestState>({ kind: "idle" });

  // Load existing config whenever the parent dialog opens.
  useEffect(() => {
    if (!active) return;
    setError(null);
    setSavingState("idle");
    setTestState({ kind: "idle" });
    chunkerClient
      .readConfig()
      .then((config) => {
        setOpenaiApiKey(config.openaiApiKey ?? "");
        setDatabaseUrl(config.databaseUrl ?? "");
        setOllamaUrl(config.ollamaUrl ?? "");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [active]);

  // Reset the test state when the URL changes — a green "Connected"
  // banner from a previous URL would be misleading next to the new one.
  useEffect(() => {
    setTestState({ kind: "idle" });
  }, [databaseUrl]);

  const testConnection = async () => {
    if (databaseUrl.trim().length === 0) {
      setTestState({ kind: "error", message: t("preferences.emptyUrl") });
      return;
    }
    setTestState({ kind: "testing" });
    try {
      const result = await chunkerClient.testDatabase(databaseUrl);
      setTestState({
        kind: "ok",
        version: result.version,
        durationMs: result.durationMs,
      });
    } catch (err) {
      setTestState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const saveConnections = async () => {
    setSavingState("saving");
    setError(null);
    try {
      const current = await chunkerClient.readConfig();
      const next: AppConfig = {
        ...current,
        openaiApiKey: openaiApiKey.trim() || null,
        databaseUrl: databaseUrl.trim() || null,
        ollamaUrl: ollamaUrl.trim() || null,
      };
      await chunkerClient.writeConfig(next);
      setSavingState("saved");
      window.setTimeout(() => setSavingState("idle"), 1500);
    } catch (err) {
      setSavingState("idle");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <DialogSection
      icon={<Plug className="h-4 w-4 text-primary" />}
      title={t("preferences.connections")}
      description={t("preferences.connectionsDescription")}
    >
      <div className="flex flex-col gap-3">
        <ConnectionsFields
          openaiApiKey={openaiApiKey}
          databaseUrl={databaseUrl}
          ollamaUrl={ollamaUrl}
          onChangeOpenaiKey={setOpenaiApiKey}
          onChangeDatabaseUrl={setDatabaseUrl}
          onChangeOllamaUrl={setOllamaUrl}
        />
        <ConnectionTestBanner state={testState} />
        <ConnectionsActions
          savingState={savingState}
          testState={testState}
          databaseUrl={databaseUrl}
          error={error}
          onTest={testConnection}
          onSave={saveConnections}
        />
      </div>
    </DialogSection>
  );
}
