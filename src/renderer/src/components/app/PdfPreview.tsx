import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { chunkerClient } from "@/services/chunker-client";
import { useT } from "@/lib/i18n";

export interface PdfPreviewProps {
  filePath: string;
}

/**
 * Renders a PDF inside Chromium's built-in viewer by reading the file
 * via IPC and handing the renderer a `blob:` URL. Same-origin (the
 * blob inherits the renderer's origin), so the PDF plugin renders it
 * without needing a custom protocol handler or webSecurity tweaks.
 */
export function PdfPreview({ filePath }: PdfPreviewProps) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setError(null);
    (async () => {
      try {
        const bytes = await chunkerClient.readFile(filePath);
        if (cancelled) return;
        // Copy into a fresh ArrayBuffer to satisfy Blob's BlobPart typing
        // (which rejects Uint8Array<ArrayBufferLike> under strict TS).
        const buf = new Uint8Array(bytes.length);
        buf.set(bytes);
        const blob = new Blob([buf], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filePath]);

  if (error) return <PreviewMessage tone="error" icon={AlertTriangle} message={`${t("viewer.pdfFailed")} ${error}`} />;
  if (!url) return <PreviewMessage tone="muted" icon={Loader2} message={t("viewer.pdfLoading")} spin />;

  return (
    <iframe
      title="pdf-preview"
      src={url}
      className="h-full w-full rounded-md border border-border bg-background"
    />
  );
}

function PreviewMessage({
  tone,
  icon: Icon,
  message,
  spin = false,
}: {
  tone: "muted" | "error";
  icon: typeof AlertTriangle;
  message: string;
  spin?: boolean;
}) {
  const colour = tone === "error" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className={`flex h-full items-center justify-center gap-2 text-sm ${colour}`}>
      <Icon className={`h-4 w-4 ${spin ? "animate-spin" : ""}`} />
      <span>{message}</span>
    </div>
  );
}
