import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useT } from "@/lib/i18n";
import type { FolderSelection } from "@shared/types";

export interface FolderHeaderProps {
  selection: FolderSelection;
  entryCount: number;
  parsedCount: number;
}

export function FolderHeader({
  selection,
  entryCount,
  parsedCount,
}: FolderHeaderProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-2 py-1.5">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span
          title={selection.path}
          className="truncate text-xs font-medium text-foreground"
        >
          {selection.name}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
          {t("folder.files", { count: entryCount })}
        </Badge>
        {parsedCount > 0 && (
          <Badge variant="success" className="px-1.5 py-0 text-[10px]">
            {t("folder.parsed", { count: parsedCount })}
          </Badge>
        )}
      </div>
    </div>
  );
}
