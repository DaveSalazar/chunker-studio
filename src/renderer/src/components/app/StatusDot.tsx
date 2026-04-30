import { cn } from "@/lib/cn";
import type { DocumentLoading } from "@/hooks/useChunkerSession";

/** Tiny colored dot reflecting a document's parsing lifecycle state. */
export function StatusDot({ loading }: { loading: DocumentLoading }) {
  const tone =
    loading === "ready"
      ? "bg-emerald-400"
      : loading === "error"
        ? "bg-destructive"
        : loading === "unparsed"
          ? "bg-muted-foreground/50"
          : "bg-primary";
  const animate =
    loading !== "ready" && loading !== "error" && loading !== "unparsed";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        tone,
        animate && "animate-pulse",
      )}
    />
  );
}
