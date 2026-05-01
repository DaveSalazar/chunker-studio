import { useState, type DragEvent } from "react";
import { FileUp, FileType2, FileText, Hash } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import logoTitleUrl from "@/assets/logo-title.png";

export interface DropzoneProps {
  onPickFile?: () => void;
  onFilesDropped?: (paths: string[]) => void;
}

export function Dropzone({ onPickFile, onFilesDropped }: DropzoneProps) {
  const t = useT();
  const [hovering, setHovering] = useState(false);

  const supported = [
    { ext: "pdf", label: t("dropzone.pdfLabel"), icon: FileType2 },
    { ext: "docx", label: t("dropzone.wordLabel"), icon: FileText },
    { ext: "txt", label: t("dropzone.plainTextLabel"), icon: Hash },
  ];

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHovering(false);
    const paths: string[] = [];
    for (const f of Array.from(e.dataTransfer.files)) {
      const path = (f as File & { path?: string }).path ?? f.name;
      paths.push(path);
    }
    onFilesDropped?.(paths);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-6 rounded-2xl border-2 border-dashed border-border bg-card/30 p-12 transition-all",
        "gradient-mesh",
        hovering &&
          "scale-[1.01] border-primary/60 bg-primary/5 shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]",
      )}
    >
      <img
        src={logoTitleUrl}
        alt="Chunker Studio"
        className="h-32 w-auto select-none"
        draggable={false}
      />

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-balance text-xl font-semibold">{t("dropzone.title")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{t("dropzone.description")}</p>
      </div>

      <Button variant="primary" size="lg" onClick={onPickFile}>
        <FileUp />
        {t("dropzone.selectFile")}
      </Button>

      <div className="mt-2 flex items-center gap-3">
        {supported.map(({ ext, label, icon: Icon }) => (
          <div
            key={ext}
            className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{label}</span>
            <span className="font-mono text-[11px]">.{ext}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
