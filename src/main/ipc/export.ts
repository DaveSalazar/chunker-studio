import { ipcMain, dialog, BrowserWindow } from "electron";
import { writeFile } from "node:fs/promises";
import type {
  ChunkRecord,
  ExportFormat,
  ExportRequest,
  ExportResult,
  IpcResult,
} from "../../shared/types";
import { wrap } from "./wrap";

interface FormatMeta {
  name: string;
  ext: string;
}

const FORMAT_META: Record<ExportFormat, FormatMeta> = {
  json: { name: "JSON", ext: "json" },
  jsonl: { name: "JSON Lines", ext: "jsonl" },
  csv: { name: "CSV", ext: "csv" },
  markdown: { name: "Markdown", ext: "md" },
  plaintext: { name: "Plain text", ext: "txt" },
};

export function registerExportHandlers(): void {
  ipcMain.handle(
    "chunks:export",
    async (event, req: ExportRequest): Promise<IpcResult<ExportResult>> =>
      wrap(async () => {
        const { format, chunks, sourceName } = req;
        const meta = FORMAT_META[format];
        const window = BrowserWindow.fromWebContents(event.sender) ?? undefined;
        const dialogResult = await dialog.showSaveDialog(window!, {
          title: "Export chunks",
          defaultPath: `${sanitizeStem(sourceName)}.${meta.ext}`,
          filters: [{ name: meta.name, extensions: [meta.ext] }],
        });
        if (dialogResult.canceled || !dialogResult.filePath) {
          return { canceled: true };
        }
        const content = formatChunks(chunks, format);
        await writeFile(dialogResult.filePath, content, "utf-8");
        return {
          canceled: false,
          path: dialogResult.filePath,
          count: chunks.length,
        };
      }),
  );
}

/**
 * Strip characters that can't survive a save dialog's default-name field
 * intact — `/` becomes a directory traversal, and Windows refuses
 * `\:*?"<>|`. Also collapse trailing extension if user passed one.
 */
function sanitizeStem(stem: string): string {
  const stripped = stem.replace(/\.[a-z0-9]{1,5}$/i, "");
  return stripped.replace(/[\\/:*?"<>|]/g, "_") || "chunks";
}

function formatChunks(chunks: ChunkRecord[], format: ExportFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(chunks, null, 2) + "\n";
    case "jsonl":
      return chunks.map((c) => JSON.stringify(c)).join("\n") + "\n";
    case "csv":
      return chunksToCsv(chunks);
    case "markdown":
      return chunksToMarkdown(chunks);
    case "plaintext":
      return chunks.map((c) => c.text).join("\n\n") + "\n";
  }
}

function chunksToCsv(chunks: ChunkRecord[]): string {
  const headers = [
    "index",
    "article",
    "heading",
    "text",
    "char_count",
    "token_count",
    "start_offset",
    "end_offset",
  ];
  const rows = chunks.map((c) =>
    [
      c.index,
      c.article ?? "",
      c.heading ?? "",
      c.text,
      c.charCount,
      c.tokenCount,
      c.startOffset,
      c.endOffset,
    ]
      .map(escapeCsv)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n") + "\n";
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function chunksToMarkdown(chunks: ChunkRecord[]): string {
  const blocks = chunks.map((c) => {
    const headerParts: string[] = [`#${c.index}`];
    if (c.article) headerParts.push(`Art. ${c.article}`);
    if (c.heading) headerParts.push(c.heading);
    const meta = `${c.tokenCount} tok · ${c.charCount} ch`;
    return `## ${headerParts.join(" — ")}\n\n${c.text}\n\n*${meta}*`;
  });
  return blocks.join("\n\n---\n\n") + "\n";
}
