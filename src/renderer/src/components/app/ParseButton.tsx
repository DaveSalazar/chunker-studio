import { Loader2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import type { DocumentLoading } from "@/hooks/useChunkerSession";

export interface ParseButtonProps {
  loading: DocumentLoading;
  onParse: () => void;
}

/**
 * Idle/error → button. In-flight → spinner badge. Ready → renders nothing.
 */
export function ParseButton({ loading, onParse }: ParseButtonProps) {
  const t = useT();
  if (loading === "ready") return null;
  if (loading === "parsing" || loading === "chunking") {
    return (
      <Badge variant="muted" className="gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        {loading === "parsing" ? t("viewer.parsing") : t("viewer.chunking")}
      </Badge>
    );
  }
  return (
    <Button
      variant="primary"
      size="sm"
      onClick={onParse}
      title={t("viewer.parseTitle")}
    >
      <Wand2 className="h-3.5 w-3.5" />
      {loading === "error" ? t("viewer.retry") : t("viewer.parse")}
    </Button>
  );
}
