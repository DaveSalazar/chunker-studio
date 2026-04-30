// Long-lived worker that parses documents (PDF / DOCX / text) off the
// main thread. The main process reads raw bytes from disk and transfers
// them in; the worker decides which parser to run based on `kind`.
//
// Heavy deps (pdfjs, mammoth) are lazy-imported so a failure loading
// one doesn't kill the worker before it can handle the other formats —
// and so worker boot stays fast.

import "reflect-metadata";
import { parentPort } from "node:worker_threads";

if (!parentPort) {
  throw new Error("parser-worker.ts must be loaded as a worker_thread");
}
console.log("[parser-worker] booted");

// Surface unhandled errors so they don't silently hang the worker.
process.on("uncaughtException", (err) => {
  console.error("[parser-worker] uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[parser-worker] unhandledRejection", reason);
});

interface ParseRequest {
  id: number;
  kind: "pdf" | "docx" | "text";
  bytes: Uint8Array;
}

type UnsupportedParseReason = "scanned-pdf";

interface ParseSuccess {
  id: number;
  ok: true;
  value: {
    text: string;
    pageCount?: number;
    warnings: string[];
    unsupportedReason?: UnsupportedParseReason;
  };
}

/**
 * Below this many extracted characters per page we treat a PDF as
 * effectively scanned — only page numbers / margin noise made it through
 * the text layer and there's nothing meaningful to chunk.
 */
const MIN_CHARS_PER_PAGE = 50;

interface ParseFailure {
  id: number;
  ok: false;
  error: string;
}

type GetTextContentItem = { str: string; hasEOL?: boolean };

async function parsePdf(bytes: Uint8Array): Promise<ParseSuccess["value"]> {
  // Lazy import — pdfjs's top-level execution is heavy and we don't
  // want it running on every worker boot, only when a PDF arrives.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  const warnings: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as GetTextContentItem[];
    const lines: string[] = [];
    let buffer = "";
    for (const item of items) {
      buffer += item.str;
      if (item.hasEOL) {
        lines.push(buffer);
        buffer = "";
      } else {
        buffer += " ";
      }
    }
    if (buffer.trim().length > 0) lines.push(buffer);
    pages.push(lines.join("\n"));
  }
  const text = pages.join("\n\n");
  const trimmedLen = text.trim().length;
  const avgCharsPerPage = doc.numPages > 0 ? trimmedLen / doc.numPages : trimmedLen;
  const looksScanned = trimmedLen === 0 || avgCharsPerPage < MIN_CHARS_PER_PAGE;
  if (looksScanned) {
    return {
      text: "",
      pageCount: doc.numPages,
      warnings,
      unsupportedReason: "scanned-pdf",
    };
  }
  return { text, pageCount: doc.numPages, warnings };
}

async function parseDocx(bytes: Uint8Array): Promise<ParseSuccess["value"]> {
  const mammothMod = await import("mammoth");
  const mammoth = mammothMod.default ?? mammothMod;
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
  });
  const warnings = result.messages
    .filter((m) => m.type === "warning" || m.type === "error")
    .map((m) => `${m.type}: ${m.message}`);
  return { text: result.value, warnings };
}

function parseText(bytes: Uint8Array): ParseSuccess["value"] {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return { text, warnings: [] };
}

parentPort.on("message", async (req: ParseRequest) => {
  console.log(
    "[parser-worker] message received id=", req.id,
    "kind=", req.kind,
    "bytes=", req.bytes?.length,
  );
  try {
    let value: ParseSuccess["value"];
    if (req.kind === "pdf") value = await parsePdf(req.bytes);
    else if (req.kind === "docx") value = await parseDocx(req.bytes);
    else value = parseText(req.bytes);
    console.log("[parser-worker] parsed id=", req.id, "text length=", value.text.length);
    const reply: ParseSuccess = { id: req.id, ok: true, value };
    parentPort!.postMessage(reply);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[parser-worker] parse failed", err);
    const reply: ParseFailure = { id: req.id, ok: false, error: message };
    parentPort!.postMessage(reply);
  }
});
