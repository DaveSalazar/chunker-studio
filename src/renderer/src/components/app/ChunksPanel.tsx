import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CloudUpload, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChunksBody } from "@/components/app/ChunksBody";
import { DuplicateJumpPill } from "@/components/app/DuplicateJumpPill";
import { ExportMenu } from "@/components/app/ExportMenu";
import { ContextMenu, ContextMenuItem, type ContextMenuPosition } from "@/components/ui/ContextMenu";
import { useChunkScrollSync } from "@/hooks/useChunkScrollSync";
import { hasTextSelection, isFormElementFocused } from "@/lib/clipboardGuards";
import { useT } from "@/lib/i18n";
import type { DocumentLoading } from "@/hooks/useChunkerSession";
import type { DuplicateInfo } from "@/lib/duplicateChunks";
import type { ChunkRecord, ChunkingResult, ParsedDocument } from "@shared/types";

const EMPTY_DUPLICATES: ReadonlyMap<number, DuplicateInfo> = new Map();
const TOAST_DURATION_MS = 1500;
const COPY_SHORTCUT = "⌘C";

export interface ChunksPanelProps {
  result: ChunkingResult | null;
  loading: DocumentLoading;
  activeChunkIndex: number | null;
  duplicateInfo?: ReadonlyMap<number, DuplicateInfo>;
  /** Parsed doc — supplies page offsets for the chunk → page mapping. */
  parsed?: ParsedDocument | null;
  /** Current PDF page (1-indexed); drives the auto-scroll. */
  pdfPage?: number;
  /** Default filename stem for the export save dialog. */
  sourceName?: string;
  onChunkClick: (index: number) => void;
  onIngest: () => void;
}

interface MenuState {
  chunkIndex: number;
  position: ContextMenuPosition;
}

export function ChunksPanel({
  result,
  loading,
  activeChunkIndex,
  duplicateInfo = EMPTY_DUPLICATES,
  parsed,
  pdfPage,
  sourceName,
  onChunkClick,
  onIngest,
}: ChunksPanelProps) {
  const t = useT();
  const chunks = result?.chunks ?? [];
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useChunkScrollSync({ result, parsed: parsed ?? null, pdfPage, activeChunkIndex });

  const findChunk = useCallback(
    (idx: number): ChunkRecord | undefined => chunks.find((c) => c.index === idx),
    [chunks],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const copyChunk = useCallback(
    async (idx: number) => {
      const chunk = findChunk(idx);
      if (!chunk) return;
      try {
        await navigator.clipboard.writeText(chunk.text);
        showToast(t("chunks.copied", { index: idx }));
      } catch (err) {
        console.error("clipboard write failed", err);
      }
    },
    [findChunk, showToast, t],
  );

  useEffect(() => {  // Cmd/Ctrl+C copies active chunk; defers to browser on selection/form focus.
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "c") return;
      if (activeChunkIndex === null) return;
      if (isFormElementFocused()) return;
      if (hasTextSelection()) return;
      e.preventDefault();
      void copyChunk(activeChunkIndex);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeChunkIndex, copyChunk]);

  const onChunkContextMenu = useCallback(
    (idx: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onChunkClick(idx);
      setMenu({ chunkIndex: idx, position: { x: e.clientX, y: e.clientY } });
    },
    [onChunkClick],
  );

  return (
    <div className="relative flex h-full flex-col gap-3 overflow-hidden pl-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-sm font-semibold">
            {t("chunks.title")}{" "}
            <span className="text-muted-foreground">({chunks.length})</span>
          </h3>
          <DuplicateJumpPill
            chunks={chunks}
            duplicateInfo={duplicateInfo}
            onChunkClick={onChunkClick}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ExportMenu chunks={chunks} sourceName={sourceName ?? "chunks"}
            disabled={!result || chunks.length === 0}
            onExported={(path) => showToast(t("chunks.exported", { path }))} />
          <Button
            variant="primary"
            size="sm"
            disabled={!result || chunks.length === 0}
            onClick={onIngest}
            title={t("ingest.buttonTooltip")}
          >
            <CloudUpload />
            {t("ingest.button")}
          </Button>
        </div>
      </div>

      <ChunksBody
        result={result}
        loading={loading}
        activeChunkIndex={activeChunkIndex}
        duplicateInfo={duplicateInfo}
        onChunkClick={onChunkClick}
        onChunkContextMenu={onChunkContextMenu}
        listRef={listRef}
      />

      <ContextMenu
        open={menu !== null}
        position={menu?.position ?? null}
        onClose={() => setMenu(null)}
      >
        <ContextMenuItem
          icon={<Copy className="h-3.5 w-3.5" />}
          shortcut={COPY_SHORTCUT}
          onSelect={() => {
            if (menu) void copyChunk(menu.chunkIndex);
            setMenu(null);
          }}
        >
          {t("chunks.copy")}
        </ContextMenuItem>
      </ContextMenu>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] text-emerald-200 shadow-md animate-fade-in"
        >
          <Check className="h-3 w-3" />
          {toast}
        </div>
      )}
    </div>
  );
}
