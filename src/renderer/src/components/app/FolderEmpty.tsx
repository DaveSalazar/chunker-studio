import { Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";

export interface FolderEmptyProps {
  onSelectFolder: () => void;
}

export function FolderEmpty({ onSelectFolder }: FolderEmptyProps) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-5 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Folder className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("folder.pickFolder")}</span>
        <span className="text-[11px] text-muted-foreground">
          {t("folder.pickFolderDescription")}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onSelectFolder}>
        <FolderOpen className="h-3.5 w-3.5" />
        {t("folder.chooseFolder")}
      </Button>
    </div>
  );
}
