import { useRef, useState } from "react";
import { Download, FileCode2, FileJson, FileText, Sheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ContextMenu,
  ContextMenuItem,
  type ContextMenuPosition,
} from "@/components/ui/ContextMenu";
import { chunkerClient } from "@/services/chunker-client";
import { useT } from "@/lib/i18n";
import type { ChunkRecord, ExportFormat } from "@shared/types";

export interface ExportMenuProps {
  chunks: ChunkRecord[];
  /** Default filename stem for the save dialog (extension is added per format). */
  sourceName: string;
  disabled?: boolean;
  /** Surface a success toast in the parent. Receives the destination path. */
  onExported?: (path: string) => void;
}

interface FormatOption {
  format: ExportFormat;
  labelKey:
    | "chunks.exportFormatJson"
    | "chunks.exportFormatJsonl"
    | "chunks.exportFormatCsv"
    | "chunks.exportFormatMarkdown"
    | "chunks.exportFormatPlaintext";
  icon: typeof FileJson;
}

const FORMATS: FormatOption[] = [
  { format: "json", labelKey: "chunks.exportFormatJson", icon: FileJson },
  { format: "jsonl", labelKey: "chunks.exportFormatJsonl", icon: FileCode2 },
  { format: "csv", labelKey: "chunks.exportFormatCsv", icon: Sheet },
  { format: "markdown", labelKey: "chunks.exportFormatMarkdown", icon: FileCode2 },
  { format: "plaintext", labelKey: "chunks.exportFormatPlaintext", icon: FileText },
];

/**
 * Replaces the disabled "Export preview" stub. Click → drops a small
 * menu under the button; pick a format → main process opens a save
 * dialog and writes the file.
 */
export function ExportMenu({
  chunks,
  sourceName,
  disabled,
  onExported,
}: ExportMenuProps) {
  const t = useT();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState<ContextMenuPosition | null>(null);

  const open = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenu({ x: rect.left, y: rect.bottom + 4 });
  };
  const close = () => setMenu(null);

  const onPick = async (format: ExportFormat) => {
    close();
    if (chunks.length === 0) return;
    try {
      const res = await chunkerClient.exportChunks({ format, chunks, sourceName });
      if (!res.canceled && res.path) onExported?.(res.path);
    } catch (err) {
      console.error("[export] failed", err);
    }
  };

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={open}
        title={t("chunks.exportTitle")}
      >
        <Download />
        {t("chunks.exportPreview")}
      </Button>
      <ContextMenu open={menu !== null} position={menu} onClose={close}>
        {FORMATS.map(({ format, labelKey, icon: Icon }) => (
          <ContextMenuItem
            key={format}
            icon={<Icon className="h-3.5 w-3.5" />}
            onSelect={() => void onPick(format)}
          >
            {t(labelKey)}
          </ContextMenuItem>
        ))}
      </ContextMenu>
    </>
  );
}
