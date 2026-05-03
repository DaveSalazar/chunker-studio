import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { chunkerClient } from "@/services/chunker-client";
import { sanitizeDocxHtml } from "@/lib/sanitizeDocxHtml";
import { useT } from "@/lib/i18n";

export interface DocxPreviewProps {
  filePath: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; html: string }
  | { kind: "error"; message: string };

/**
 * Renders a `.docx` file as HTML in the original-file viewer pane.
 * Pulls the bytes through the main process (mammoth.convertToHtml in
 * the parser worker), sanitizes the response renderer-side, and drops
 * it into a styled scrollable container.
 *
 * Faithful enough for typical legal templates (paragraphs, headings,
 * lists, tables, inline images). Page layout, headers/footers, text
 * boxes, and embedded objects beyond images are not preserved — this
 * is structured HTML, not page-faithful rendering.
 */
export function DocxPreview({ filePath }: DocxPreviewProps) {
  const t = useT();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    chunkerClient
      .renderDocxHtml(filePath)
      .then((res) => {
        if (cancelled) return;
        const safe = sanitizeDocxHtml(res.html);
        setState({ kind: "ready", html: safe });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (state.kind === "loading") {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t("viewer.docxLoading")}</span>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span>{t("viewer.docxFailed")} {state.message}</span>
      </div>
    );
  }
  return <DocxHtmlBody html={state.html} />;
}

/**
 * Scoped styles for the rendered HTML. Tailwind's `prose` would do
 * this for us but it's not in the dep tree — a small inline
 * stylesheet keeps the dep surface flat. Headings, paragraphs, lists,
 * and tables get sane spacing + readable typography against the dark
 * theme. Operators editing the doc's structure see roughly what Word
 * shows, minus the page chrome.
 */
function DocxHtmlBody({ html }: { html: string }) {
  return (
    <div className="h-full overflow-auto bg-background">
      <div
        className="docx-preview mx-auto max-w-3xl px-6 py-8 text-[13.5px] leading-relaxed text-foreground/90"
        // Already sanitized in the parent — this is the only innerHTML
        // surface in the renderer and the source is mammoth's writer
        // (constrained tag set), not arbitrary user HTML.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
