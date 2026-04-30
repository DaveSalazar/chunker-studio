import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PdfNav } from "@/components/app/PdfNav";
import { chunkerClient } from "@/services/chunker-client";
import { useT } from "@/lib/i18n";

// One-time worker registration. The Vite `?url` import returns a hashed
// path that the renderer can fetch — pdfjs spins it up as a Web Worker
// for off-main-thread parsing + rendering.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfPreviewProps {
  filePath: string;
  /**
   * When false, the canvas isn't (re)drawn. The PDFDocumentProxy stays
   * alive across tab switches so re-activating is instant — only the
   * GPU-bound paint is gated by `active`.
   */
  active?: boolean;
}

/**
 * Lightweight PDF preview backed by pdfjs-dist + a single canvas. Way
 * cheaper than mounting a full Chromium PDF iframe per tab, which used
 * to balloon GPU memory once a few large PDFs were open.
 */
export function PdfPreview({ filePath, active = true }: PdfPreviewProps) {
  const t = useT();
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load the document whenever filePath changes; destroy on unmount.
  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    let openedDoc: PDFDocumentProxy | null = null;
    setPdf(null);
    setPageNum(1);
    setPageInput("1");
    setError(null);
    (async () => {
      try {
        const bytes = await chunkerClient.readFile(filePath);
        if (cancelled) return;
        const buf = new Uint8Array(bytes.length);
        buf.set(bytes);
        task = pdfjsLib.getDocument({ data: buf });
        const doc = await task.promise;
        if (cancelled) {
          await doc.destroy();
          return;
        }
        openedDoc = doc;
        setPdf(doc);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
      task?.destroy();
      openedDoc?.destroy();
    };
  }, [filePath]);

  // Paint the active page. Skipped when the slot is hidden (inactive
  // tab) so we don't burn GPU cycles drawing offscreen pixels.
  useEffect(() => {
    if (!pdf || !active || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    type RenderTask = ReturnType<
      Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]
    >;
    let renderTask: RenderTask | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;
        const containerWidth = containerRef.current?.clientWidth ?? 800;
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.max(0.5, (containerWidth - 32) / baseViewport.width);
        const viewport = page.getViewport({ scale: fitScale });
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (!cancelled && name !== "RenderingCancelledException") {
          console.error("[pdf] render failed", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNum, active]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span>{t("viewer.pdfFailed")} {error}</span>
      </div>
    );
  }
  if (!pdf) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t("viewer.pdfLoading")}</span>
      </div>
    );
  }

  const total = pdf.numPages;
  const goTo = (n: number) => {
    setPageNum(n);
    setPageInput(String(n));
  };
  const commit = () => {
    const parsed = parseInt(pageInput, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= total) goTo(parsed);
    else setPageInput(String(pageNum));
  };

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-background">
      <PdfNav
        pageNum={pageNum}
        pageInput={pageInput}
        totalPages={total}
        onPageInputChange={setPageInput}
        onCommit={commit}
        onPrev={() => goTo(Math.max(1, pageNum - 1))}
        onNext={() => goTo(Math.min(total, pageNum + 1))}
        prevLabel={t("viewer.pdfPrevPage")}
        nextLabel={t("viewer.pdfNextPage")}
      />
      <div className="flex-1 overflow-auto p-4">
        <canvas ref={canvasRef} className="mx-auto rounded shadow-lg" />
      </div>
    </div>
  );
}
