import { Loader2, RefreshCw, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";
import type { DocumentLoading } from "@/hooks/useChunkerSession";

export interface ParseButtonProps {
  loading: DocumentLoading;
  onParse: () => void;
  /** Re-parse handler. When provided and the doc is `ready`, the
   *  button shifts to a Re-parse affordance instead of rendering
   *  nothing. Omit it for callers that don't want the refresh path. */
  onReparse?: () => void;
}

/**
 * Idle/error → Parse button. In-flight → spinner badge. Ready →
 * Re-parse button (when `onReparse` is wired) or nothing.
 */
export function ParseButton({ loading, onParse, onReparse }: ParseButtonProps) {
  const t = useT();
  if (loading === "ready") {
    if (!onReparse) return null;
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onReparse}
        title={t("viewer.reparseTitle")}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {t("viewer.reparse")}
      </Button>
    );
  }
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
