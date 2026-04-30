import { useCallback, useState } from "react";
import { ChevronsRight, Plus, Trash2, X, XOctagon } from "lucide-react";
import { DocumentTab } from "@/components/app/DocumentTab";
import {
  ContextMenu,
  ContextMenuItem,
  type ContextMenuPosition,
} from "@/components/ui/ContextMenu";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import type { DocumentEntry } from "@/hooks/useChunkerSession";

export interface DocumentTabsProps {
  documents: DocumentEntry[];
  activeId: string | null;
  /** ID of the current preview/temp tab (italic), or null. */
  tempId: string | null;
  onSelect: (id: string) => void;
  onPromote: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
  className?: string;
}

interface MenuState {
  id: string;
  position: ContextMenuPosition;
}

export function DocumentTabs({
  documents,
  activeId,
  tempId,
  onSelect,
  onPromote,
  onClose,
  onAdd,
  className,
}: DocumentTabsProps) {
  const t = useT();
  const [menu, setMenu] = useState<MenuState | null>(null);

  // Bulk-close helpers — `closeDocument` in useChunkerSession is a single-id
  // setState call; calling it N times in the same tick batches naturally.
  const closeOthers = useCallback(
    (keepId: string) => {
      for (const doc of documents) if (doc.id !== keepId) onClose(doc.id);
    },
    [documents, onClose],
  );
  const closeToRight = useCallback(
    (id: string) => {
      const idx = documents.findIndex((d) => d.id === id);
      if (idx < 0) return;
      for (let i = idx + 1; i < documents.length; i++) onClose(documents[i].id);
    },
    [documents, onClose],
  );
  const closeAll = useCallback(() => {
    for (const doc of documents) onClose(doc.id);
  }, [documents, onClose]);

  const onTabContextMenu = useCallback(
    (id: string) => (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setMenu({ id, position: { x: e.clientX, y: e.clientY } });
    },
    [],
  );

  const targetIndex = menu ? documents.findIndex((d) => d.id === menu.id) : -1;
  const hasOthers = documents.length > 1;
  const hasRight = targetIndex >= 0 && targetIndex < documents.length - 1;

  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-card/30 p-1",
        className,
      )}
    >
      {documents.map((doc) => (
        <DocumentTab
          key={doc.id}
          doc={doc}
          active={doc.id === activeId}
          temp={doc.id === tempId}
          onSelect={() => onSelect(doc.id)}
          onPromote={() => onPromote(doc.id)}
          onClose={() => onClose(doc.id)}
          onContextMenu={onTabContextMenu(doc.id)}
        />
      ))}

      <button
        type="button"
        onClick={onAdd}
        className={cn(
          "flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-border px-3 text-xs font-medium text-muted-foreground transition-colors",
          "hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        {t("tabs.addDocument")}
      </button>

      <ContextMenu
        open={menu !== null}
        position={menu?.position ?? null}
        onClose={() => setMenu(null)}
      >
        <ContextMenuItem
          icon={<X className="h-3.5 w-3.5" />}
          onSelect={() => {
            if (menu) onClose(menu.id);
            setMenu(null);
          }}
        >
          {t("tabs.close")}
        </ContextMenuItem>
        <ContextMenuItem
          icon={<XOctagon className="h-3.5 w-3.5" />}
          disabled={!hasOthers}
          onSelect={() => {
            if (menu) closeOthers(menu.id);
            setMenu(null);
          }}
        >
          {t("tabs.closeOthers")}
        </ContextMenuItem>
        <ContextMenuItem
          icon={<ChevronsRight className="h-3.5 w-3.5" />}
          disabled={!hasRight}
          onSelect={() => {
            if (menu) closeToRight(menu.id);
            setMenu(null);
          }}
        >
          {t("tabs.closeToRight")}
        </ContextMenuItem>
        <ContextMenuItem
          icon={<Trash2 className="h-3.5 w-3.5" />}
          onSelect={() => {
            closeAll();
            setMenu(null);
          }}
        >
          {t("tabs.closeAll")}
        </ContextMenuItem>
      </ContextMenu>
    </div>
  );
}
