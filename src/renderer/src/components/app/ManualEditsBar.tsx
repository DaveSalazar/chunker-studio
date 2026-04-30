import { Pencil, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";

export interface ManualEditsBarProps {
  onResetToAuto: () => void;
}

/**
 * Inline indicator + reset action shown in the document viewer header
 * when a doc is in manualMode. Stateless — both fields are derived
 * from the active doc upstream.
 */
export function ManualEditsBar({ onResetToAuto }: ManualEditsBarProps) {
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="default"
        className="gap-1.5"
        title={t("viewer.manualBadgeTitle")}
      >
        <Pencil className="h-3 w-3" />
        {t("viewer.manualBadge")}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={onResetToAuto}
        title={t("viewer.resetToAutoTitle")}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {t("viewer.resetToAuto")}
      </Button>
    </div>
  );
}
