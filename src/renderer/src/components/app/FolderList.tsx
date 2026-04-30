import { CircleDashed } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { FolderEntryRow } from "@/components/app/FolderEntryRow";
import { useT } from "@/lib/i18n";
import type { FolderEntry } from "@shared/types";

export interface FolderListProps {
  entries: FolderEntry[];
  filtered: FolderEntry[];
  parsedPaths: ReadonlySet<string>;
  loading: "idle" | "listing";
  query: string;
  onLoadEntry: (entry: FolderEntry, opts?: { permanent?: boolean }) => void;
}

export function FolderList({
  entries,
  filtered,
  parsedPaths,
  loading,
  query,
  onLoadEntry,
}: FolderListProps) {
  const t = useT();

  if (entries.length === 0 && loading !== "listing") {
    return (
      <EmptyState
        icon={CircleDashed}
        title={t("folder.empty")}
        description={t("folder.emptyDescription")}
      />
    );
  }

  return (
    <ul className="-mx-2 flex max-h-[40vh] flex-col overflow-y-auto pr-1">
      {filtered.map((entry) => (
        <FolderEntryRow
          key={entry.path}
          entry={entry}
          parsed={parsedPaths.has(entry.path)}
          onLoad={(permanent) => onLoadEntry(entry, { permanent })}
        />
      ))}
      {filtered.length === 0 && entries.length > 0 && (
        <li className="px-2 py-3 text-center text-xs text-muted-foreground">
          {t("folder.noMatches", { query })}
        </li>
      )}
    </ul>
  );
}
