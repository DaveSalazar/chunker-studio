import { useMemo, useState } from "react";
import { AlertTriangle, Folder, Search, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FolderActions } from "@/components/app/FolderActions";
import { FolderEmpty } from "@/components/app/FolderEmpty";
import { FolderHeader } from "@/components/app/FolderHeader";
import { FolderList } from "@/components/app/FolderList";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import type { FolderEntry, FolderSelection } from "@shared/types";

export interface FolderPanelProps {
  selection: FolderSelection | null;
  entries: FolderEntry[];
  loading: "idle" | "listing";
  error: string | null;

  /** Set of doc paths that have completed parsing — drives the green check. */
  parsedPaths: ReadonlySet<string>;

  onSelectFolder: () => void;
  onCloseFolder: () => void;
  onRefresh: () => void;
  onLoadEntry: (entry: FolderEntry, opts?: { permanent?: boolean }) => void;
  onParseAll: () => void;

  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function FolderPanel({
  selection,
  entries,
  loading,
  error,
  parsedPaths,
  onSelectFolder,
  onCloseFolder,
  onRefresh,
  onLoadEntry,
  onParseAll,
  collapsed = false,
  onToggleCollapsed,
}: FolderPanelProps) {
  const t = useT();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.relativePath.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const parsedCount = useMemo(
    () => entries.filter((e) => parsedPaths.has(e.path)).length,
    [entries, parsedPaths],
  );
  const remainingCount = entries.length - parsedCount;

  const parseAllTitle =
    remainingCount === 0
      ? t("folder.parseAllNoneTitle")
      : t(
          remainingCount === 1
            ? "folder.parseAllRemainingTitle"
            : "folder.parseAllRemainingTitlePlural",
          { count: remainingCount },
        );

  return (
    <Card className="flex shrink-0 flex-col">
      <CardHeader className={cn("gap-3", collapsed && "pb-5")}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-primary" />
            {t("folder.title")}
          </CardTitle>
          <FolderActions
            hasSelection={!!selection}
            collapsed={collapsed}
            loading={loading}
            onRefresh={onRefresh}
            onCloseFolder={onCloseFolder}
            onToggleCollapsed={onToggleCollapsed}
          />
        </div>

        {!collapsed && selection && (
          <FolderHeader
            selection={selection}
            entryCount={entries.length}
            parsedCount={parsedCount}
          />
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="flex flex-col gap-3 pb-4">
          {!selection ? (
            <FolderEmpty onSelectFolder={onSelectFolder} />
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("folder.filter")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-8 pl-7 text-xs"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-8"
                  onClick={onParseAll}
                  disabled={remainingCount === 0 || loading === "listing"}
                  title={parseAllTitle}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {remainingCount > 0
                    ? t("folder.parseAllCount", { count: remainingCount })
                    : t("folder.parseAll")}
                </Button>
              </div>

              <FolderList
                entries={entries}
                filtered={filtered}
                parsedPaths={parsedPaths}
                loading={loading}
                query={query}
                onLoadEntry={onLoadEntry}
              />
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
