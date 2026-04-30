import { type ReactNode } from "react";
import { Cpu, Database, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useT } from "@/lib/i18n";

export interface ConnectionsFieldsProps {
  openaiApiKey: string;
  databaseUrl: string;
  ollamaUrl: string;
  onChangeOpenaiKey: (next: string) => void;
  onChangeDatabaseUrl: (next: string) => void;
  onChangeOllamaUrl: (next: string) => void;
}

export function ConnectionsFields({
  openaiApiKey,
  databaseUrl,
  ollamaUrl,
  onChangeOpenaiKey,
  onChangeDatabaseUrl,
  onChangeOllamaUrl,
}: ConnectionsFieldsProps) {
  const t = useT();
  return (
    <>
      <FieldRow
        icon={<KeyRound className="h-3.5 w-3.5 text-muted-foreground" />}
        label={t("preferences.openaiKeyLabel")}
      >
        <Input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={openaiApiKey}
          onChange={(e) => onChangeOpenaiKey(e.target.value)}
          placeholder={t("preferences.openaiKeyPlaceholder")}
        />
      </FieldRow>
      <FieldRow
        icon={<Database className="h-3.5 w-3.5 text-muted-foreground" />}
        label={t("preferences.databaseUrlLabel")}
      >
        <Input
          // Plain text rather than masked: operators routinely need to
          // read the URL back to verify host / db / user. The password
          // inside the URL stays in the file anyway; masking the whole
          // string just makes typos harder to spot.
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={databaseUrl}
          onChange={(e) => onChangeDatabaseUrl(e.target.value)}
          placeholder={t("preferences.databaseUrlPlaceholder")}
          className="font-mono text-xs"
        />
      </FieldRow>
      <FieldRow
        icon={<Cpu className="h-3.5 w-3.5 text-muted-foreground" />}
        label={t("preferences.ollamaUrlLabel")}
      >
        <Input
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={ollamaUrl}
          onChange={(e) => onChangeOllamaUrl(e.target.value)}
          placeholder="http://localhost:11434"
          className="font-mono text-xs"
        />
      </FieldRow>
    </>
  );
}

function FieldRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
