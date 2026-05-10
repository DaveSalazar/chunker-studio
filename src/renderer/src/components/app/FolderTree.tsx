import { useCallback, useMemo, useState } from "react";
import { CircleDashed } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { FolderEntryRow } from "@/components/app/FolderEntryRow";
import { FolderTreeNode } from "@/components/app/FolderTreeNode";
import { useT } from "@/lib/i18n";
import {
  buildFolderTree,
  collectFolderPaths,
  type TreeFolder,
} from "@/lib/folderTree";
import type { FolderEntry } from "@shared/types";

export interface FolderTreeProps {
  /** Full unfiltered list — drives the empty-state. */
  entries: FolderEntry[];
  /** Filtered list — the tree is built from this so subtrees with no
   *  matches are pruned automatically. */
  filtered: FolderEntry[];
  parsedPaths: ReadonlySet<string>;
  loading: "idle" | "listing";
  query: string;
  onLoadEntry: (entry: FolderEntry, opts?: { permanent?: boolean }) => void;
  /** Select-to-Index state. `unchecked` = file paths the user excluded. */
  unchecked: ReadonlySet<string>;
  onToggleFile: (path: string) => void;
  onToggleFolder: (folder: TreeFolder) => void;
}

export function FolderTree({
  entries,
  filtered,
  parsedPaths,
  loading,
  query,
  onLoadEntry,
  unchecked,
  onToggleFile,
  onToggleFolder,
}: FolderTreeProps) {
  const t = useT();
  const tree = useMemo(() => buildFolderTree(filtered), [filtered]);

  // User-controlled expand state (default empty = fully collapsed).
  // When a search query is active we override to expand-all so matches
  // stay visible — otherwise the user types and sees nothing change.
  const [manualExpanded, setManualExpanded] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const expanded = useMemo<ReadonlySet<string>>(() => {
    if (query.trim()) return new Set(collectFolderPaths(tree));
    return manualExpanded;
  }, [query, tree, manualExpanded]);

  const onToggleExpanded = useCallback((path: string) => {
    setManualExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (entries.length === 0 && loading !== "listing") {
    return (
      <EmptyState
        icon={CircleDashed}
        title={t("folder.empty")}
        description={t("folder.emptyDescription")}
      />
    );
  }

  if (filtered.length === 0 && entries.length > 0) {
    return (
      <p className="px-2 py-3 text-center text-xs text-muted-foreground">
        {t("folder.noMatches", { query })}
      </p>
    );
  }

  return (
    <ul className="-mx-2 flex max-h-[40vh] flex-col overflow-y-auto pr-1">
      {tree.folders.map((child) => (
        <FolderTreeNode
          key={child.path}
          folder={child}
          depth={0}
          expanded={expanded}
          onToggleExpanded={onToggleExpanded}
          parsedPaths={parsedPaths}
          onLoadEntry={onLoadEntry}
          unchecked={unchecked}
          onToggleFile={onToggleFile}
          onToggleFolder={onToggleFolder}
        />
      ))}
      {tree.files.map((entry) => (
        <FolderEntryRow
          key={entry.path}
          entry={entry}
          parsed={parsedPaths.has(entry.path)}
          showRelativePath={false}
          checked={!unchecked.has(entry.path)}
          onToggleChecked={() => onToggleFile(entry.path)}
          onLoad={(permanent) => onLoadEntry(entry, { permanent })}
        />
      ))}
    </ul>
  );
}
