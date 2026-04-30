import { useState } from "react";
import { AlertTriangle, Cpu, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { useT } from "@/lib/i18n";
import { chunkerClient } from "@/services/chunker-client";
import { expectedDimensionFor } from "@/lib/embeddingLimits";
import type {
  EmbeddingPin,
  EmbeddingProviderId,
  OllamaModel,
} from "@shared/types";

export interface EmbeddingPinEditorProps {
  value: EmbeddingPin;
  onChange: (next: EmbeddingPin) => void;
  /** Read from the global config for the Ollama list call; null = use the provider's default URL. */
  ollamaUrl: string | null;
}

export function EmbeddingPinEditor({
  value,
  onChange,
  ollamaUrl,
}: EmbeddingPinEditorProps) {
  const t = useT();
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  const refreshModels = async () => {
    setLoading(true);
    setProbeError(null);
    try {
      const list = await chunkerClient.listOllamaModels(ollamaUrl);
      setModels(list);
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const probeDimensions = async () => {
    if (!value.model) return;
    setLoading(true);
    setProbeError(null);
    try {
      const { dimensions } = await chunkerClient.probeOllamaModel(ollamaUrl, value.model);
      onChange({ ...value, dimensions });
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          {t("schemas.embeddingProvider")}
        </Label>
        <Segmented<EmbeddingProviderId>
          value={value.providerId}
          onChange={(providerId) => onChange({ ...value, providerId })}
          options={[
            { value: "openai", label: "OpenAI" },
            { value: "ollama", label: "Ollama" },
          ]}
          className="w-full justify-stretch [&>button]:flex-1"
        />
      </div>

      {value.providerId === "openai" ? (
        <div className="flex flex-col gap-1.5">
          <Label>{t("schemas.embeddingModel")}</Label>
          <Input
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
            placeholder="text-embedding-3-small"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label>{t("schemas.embeddingModel")}</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshModels}
              disabled={loading}
              title={t("schemas.refreshModels")}
            >
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {t("schemas.refreshModels")}
            </Button>
          </div>
          <Select
            value={value.model}
            onChange={(e) => onChange({ ...value, model: e.target.value })}
          >
            <option value="">{t("schemas.pickModel")}</option>
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
                {m.details ? ` · ${m.details}` : ""}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label>{t("schemas.embeddingDimensions")}</Label>
          <Input
            type="number"
            value={value.dimensions}
            onChange={(e) =>
              onChange({ ...value, dimensions: Number(e.target.value) || 0 })
            }
            placeholder="1536"
          />
        </div>
        {value.providerId === "ollama" && (
          <Button
            size="sm"
            variant="outline"
            onClick={probeDimensions}
            disabled={loading || !value.model}
            title={t("schemas.probeDimsTitle")}
          >
            {t("schemas.probeDims")}
          </Button>
        )}
      </div>

      {probeError && (
        <p className="text-[11px] text-destructive">{probeError}</p>
      )}
      <DimensionMismatchWarning value={value} />
      <p className="text-[11px] text-muted-foreground">
        {t("schemas.dimensionsHint")}
      </p>
    </div>
  );
}

function DimensionMismatchWarning({
  value,
}: {
  value: EmbeddingPin;
}) {
  const t = useT();
  const expected = expectedDimensionFor(value.providerId, value.model);
  if (expected === null || expected === value.dimensions) return null;
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-amber-300">
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        {t("schemas.dimensionMismatchWarning", {
          expected,
          actual: value.dimensions,
          model: value.model,
        })}
      </span>
    </p>
  );
}
