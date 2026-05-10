import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { FolderEntryRow } from "@/components/app/FolderEntryRow";
import { folderCheckState, type TreeFolder } from "@/lib/folderTree";
import type { FolderEntry } from "@shared/types";

export interface FolderTreeNodeProps {
  folder: TreeFolder;
  /** 0 for top-level folders. Each step adds one indent level. */
  depth: number;
  expanded: ReadonlySet<string>;
  onToggleExpanded: (path: string) => void;
  parsedPaths: ReadonlySet<string>;
  onLoadEntry: (entry: FolderEntry, opts?: { permanent?: boolean }) => void;
  /** Set of file paths the user has unchecked. Empty = all selected. */
  unchecked: ReadonlySet<string>;
  onToggleFile: (path: string) => void;
  onToggleFolder: (folder: TreeFolder) => void;
}

export function FolderTreeNode({
  folder,
  depth,
  expanded,
  onToggleExpanded,
  parsedPaths,
  onLoadEntry,
  unchecked,
  onToggleFile,
  onToggleFolder,
}: FolderTreeNodeProps) {
  const isOpen = expanded.has(folder.path);
  const Chevron = isOpen ? ChevronDown : ChevronRight;
  const FolderIcon = isOpen ? FolderOpen : Folder;
  const directCount = folder.files.length;
  const subCount = folder.folders.length;
  const checkState = folderCheckState(folder, unchecked);

  return (
    <li>
      <div
        className="group flex w-full items-center gap-1.5"
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
      >
        <Checkbox
          checked={checkState !== "unchecked"}
          indeterminate={checkState === "indeterminate"}
          onChange={() => onToggleFolder(folder)}
          ariaLabel={`Indexar carpeta ${folder.name}`}
        />
        <button
          type="button"
          onClick={() => onToggleExpanded(folder.path)}
          className="flex flex-1 items-center gap-1 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-secondary/60"
          aria-expanded={isOpen}
        >
          <Chevron className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <FolderIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate text-xs font-medium text-foreground">
            {folder.name}
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {summarize(directCount, subCount)}
          </span>
        </button>
      </div>

      {isOpen && (folder.folders.length > 0 || folder.files.length > 0) && (
        <ul className="flex flex-col">
          {folder.folders.map((child) => (
            <FolderTreeNode
              key={child.path}
              folder={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpanded={onToggleExpanded}
              parsedPaths={parsedPaths}
              onLoadEntry={onLoadEntry}
              unchecked={unchecked}
              onToggleFile={onToggleFile}
              onToggleFolder={onToggleFolder}
            />
          ))}
          {folder.files.map((entry) => (
            <div
              key={entry.path}
              style={{ paddingLeft: `${0.5 + (depth + 1) * 0.75}rem` }}
            >
              <FolderEntryRow
                entry={entry}
                parsed={parsedPaths.has(entry.path)}
                showRelativePath={false}
                checked={!unchecked.has(entry.path)}
                onToggleChecked={() => onToggleFile(entry.path)}
                onLoad={(permanent) => onLoadEntry(entry, { permanent })}
              />
            </div>
          ))}
        </ul>
      )}
    </li>
  );
}

// "3 docs", "2 folders", "2 folders · 5 docs". Empty folders shouldn't
// appear (the walker only emits files), but render "(empty)" defensively.
function summarize(direct: number, sub: number): string {
  const parts: string[] = [];
  if (sub > 0) parts.push(`${sub} ${sub === 1 ? "folder" : "folders"}`);
  if (direct > 0) parts.push(`${direct} ${direct === 1 ? "doc" : "docs"}`);
  return parts.length === 0 ? "(empty)" : parts.join(" · ");
}
