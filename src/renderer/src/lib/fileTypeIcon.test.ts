import { describe, expect, it } from "vitest";
import { File as FileBlank, FileCode2, FileText, FileType2 } from "lucide-react";
import { fileTypeIcon } from "./fileTypeIcon";

describe("fileTypeIcon", () => {
  it("returns the PDF icon + rose accent for 'pdf'", () => {
    const info = fileTypeIcon("pdf");
    expect(info.Icon).toBe(FileType2);
    expect(info.iconColor).toBe("text-rose-400");
  });

  it("returns the doc icon + sky accent for 'docx' and 'doc'", () => {
    expect(fileTypeIcon("docx").Icon).toBe(FileText);
    expect(fileTypeIcon("doc").Icon).toBe(FileText);
    expect(fileTypeIcon("docx").iconColor).toBe("text-sky-400");
  });

  it("returns the plain-text icon for 'txt'", () => {
    const info = fileTypeIcon("txt");
    expect(info.Icon).toBe(FileBlank);
    expect(info.iconColor).toBe("text-zinc-400");
  });

  it("returns the markdown icon + violet accent for 'md'", () => {
    const info = fileTypeIcon("md");
    expect(info.Icon).toBe(FileCode2);
    expect(info.iconColor).toBe("text-violet-400");
  });

  it("normalizes case (PDF → pdf)", () => {
    const upper = fileTypeIcon("PDF");
    const lower = fileTypeIcon("pdf");
    expect(upper.Icon).toBe(lower.Icon);
    expect(upper.iconColor).toBe(lower.iconColor);
  });

  it("returns the default for an unknown extension", () => {
    const info = fileTypeIcon("xlsx");
    expect(info.Icon).toBe(FileBlank);
    expect(info.iconColor).toBe("text-muted-foreground");
  });

  it("returns the default for an empty string", () => {
    expect(fileTypeIcon("").iconColor).toBe("text-muted-foreground");
  });

  it("returns the default for null/undefined extension", () => {
    expect(fileTypeIcon(null).iconColor).toBe("text-muted-foreground");
    expect(fileTypeIcon(undefined).iconColor).toBe("text-muted-foreground");
  });
});
