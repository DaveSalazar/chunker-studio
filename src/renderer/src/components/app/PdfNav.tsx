import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface PdfNavProps {
  pageNum: number;
  pageInput: string;
  totalPages: number;
  onPageInputChange: (v: string) => void;
  onCommit: () => void;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}

/**
 * Page-navigation toolbar for `PdfPreview`. Renders prev/next buttons +
 * a number input that jumps directly to a page on Enter / blur.
 */
export function PdfNav({
  pageNum,
  pageInput,
  totalPages,
  onPageInputChange,
  onCommit,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: PdfNavProps) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-b border-border bg-card/30 px-3 py-1.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onPrev}
        disabled={pageNum <= 1}
        aria-label={prevLabel}
        title={prevLabel}
      >
        <ChevronLeft />
      </Button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCommit();
        }}
        className="flex items-center gap-1.5"
      >
        <Input
          type="number"
          min={1}
          max={totalPages}
          value={pageInput}
          onChange={(e) => onPageInputChange(e.target.value)}
          onBlur={onCommit}
          className="h-7 w-16 px-2 text-center font-mono text-xs"
        />
        <span className="font-mono text-xs text-muted-foreground">
          / {totalPages}
        </span>
      </form>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onNext}
        disabled={pageNum >= totalPages}
        aria-label={nextLabel}
        title={nextLabel}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
