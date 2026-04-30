import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { chunkerClient } from "@/services/chunker-client";
import { useT } from "@/lib/i18n";

export interface TextPreviewProps {
  filePath: string;
}

/**
 * Reads a UTF-8 text file via IPC and renders it inside a <pre>. Used
 * for .txt and .md files in the "Original" view.
 */
export function TextPreview({ filePath }: TextPreviewProps) {
  const t = useT();
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);
    (async () => {
      try {
        const bytes = await chunkerClient.readFile(filePath);
        if (cancelled) return;
        setText(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  if (error)
    return (
      <Message tone="error" icon={AlertTriangle} message={`${t("viewer.textFailed")} ${error}`} />
    );
  if (text === null)
    return <Message tone="muted" icon={Loader2} message={t("viewer.textLoading")} spin />;

  return (
    <div className="h-full overflow-auto rounded-md border border-border bg-background">
      <pre className="whitespace-pre-wrap p-5 font-mono text-[12.5px] leading-relaxed text-foreground/85">
        {text}
      </pre>
    </div>
  );
}

function Message({
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
