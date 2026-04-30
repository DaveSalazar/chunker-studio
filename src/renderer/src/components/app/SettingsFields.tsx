import { AlertTriangle, HelpCircle } from "lucide-react";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { Separator } from "@/components/ui/Separator";
import { Tooltip } from "@/components/ui/Tooltip";
import { useT } from "@/lib/i18n";
import { EMBEDDING_INPUT_TOKEN_CAP } from "@/lib/embeddingLimits";
import type { ChunkSettings } from "@shared/types";

export interface SettingsFieldsProps {
  value: ChunkSettings;
  onChange: (patch: Partial<ChunkSettings>) => void;
  disabled?: boolean;
}

export function SettingsFields({ value, onChange, disabled }: SettingsFieldsProps) {
  const t = useT();
  return (
    <fieldset
      disabled={disabled}
      className="flex w-full min-w-0 flex-col gap-6 disabled:opacity-50"
    >
      <div className="flex flex-col gap-1.5">
        <Slider
          label={t("settings.fields.maxChunkTokens")}
          unit={t("settings.units.tokens")}
          hint={<HelpHint content={t("settings.fields.maxChunkTokensHelp")} />}
          min={100}
          max={1500}
          step={50}
          value={value.maxChunkTokens}
          onValueChange={(v) => onChange({ maxChunkTokens: v })}
        />
        {value.maxChunkTokens > EMBEDDING_INPUT_TOKEN_CAP && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-300">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {t("settings.fields.maxChunkTokensWarning", {
                cap: EMBEDDING_INPUT_TOKEN_CAP,
              })}
            </span>
          </p>
        )}
      </div>
      <Slider
        label={t("settings.fields.minChunkChars")}
        unit={t("settings.units.chars")}
        hint={<HelpHint content={t("settings.fields.minChunkCharsHelp")} />}
        min={20}
        max={400}
        step={10}
        value={value.minChunkChars}
        onValueChange={(v) => onChange({ minChunkChars: v })}
      />
      <Slider
        label={t("settings.fields.headingLookback")}
        unit={t("settings.units.chars")}
        hint={<HelpHint content={t("settings.fields.headingLookbackHelp")} />}
        min={100}
        max={2000}
        step={100}
        value={value.headingLookback}
        onValueChange={(v) => onChange({ headingLookback: v })}
      />
      <Slider
        label={t("settings.fields.letterRatio")}
        unit={t("settings.units.percent")}
        hint={<HelpHint content={t("settings.fields.letterRatioHelp")} />}
        min={0}
        max={100}
        step={5}
        value={value.letterRatio}
        onValueChange={(v) => onChange({ letterRatio: v })}
      />

      <Slider
        label={t("settings.fields.duplicateMinChars")}
        unit={t("settings.units.chars")}
        hint={<HelpHint content={t("settings.fields.duplicateMinCharsHelp")} />}
        min={0}
        max={500}
        step={10}
        value={value.duplicateMinChars}
        onValueChange={(v) => onChange({ duplicateMinChars: v })}
      />

      <Separator />

      <ToggleRow
        label={t("settings.fields.dehyphenate")}
        description={t("settings.fields.dehyphenateDescription")}
        help={t("settings.fields.dehyphenateHelp")}
        checked={value.dehyphenate}
        onChange={(v) => onChange({ dehyphenate: v })}
      />
      <ToggleRow
        label={t("settings.fields.splitByArticle")}
        description={t("settings.fields.splitByArticleDescription")}
        help={t("settings.fields.splitByArticleHelp")}
        checked={value.splitByArticle}
        onChange={(v) => onChange({ splitByArticle: v })}
      />
      <ToggleRow
        label={t("settings.fields.dropDuplicates")}
        description={t("settings.fields.dropDuplicatesDescription")}
        help={t("settings.fields.dropDuplicatesHelp")}
        checked={value.dropDuplicates}
        onChange={(v) => onChange({ dropDuplicates: v })}
      />
    </fieldset>
  );
}

function ToggleRow({
  label,
  description,
  help,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex w-full min-w-0 items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-medium">{label}</span>
          <HelpHint content={help} />
        </div>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

function HelpHint({ content }: { content: string }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        aria-label={content}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
