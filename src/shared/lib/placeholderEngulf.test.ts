import { describe, expect, it } from "vitest";
import {
  applyManualPlaceholder,
  engulfRange,
  findPlaceholderTokens,
  normToSource,
} from "./placeholderEngulf";
import type { PlaceholderMatch } from "./placeholders";

function match(
  start: number,
  raw: string,
  replacement: string,
  name = "DATO",
): PlaceholderMatch {
  return { name, raw, replacement, start, end: start + raw.length };
}

describe("findPlaceholderTokens", () => {
  it("returns an empty list for plain text", () => {
    expect(findPlaceholderTokens("just text, no tokens here")).toEqual([]);
  });

  it("finds one token", () => {
    expect(findPlaceholderTokens("El comprador <<NOMBRE>> firmará")).toEqual([
      { start: 13, end: 23 },
    ]);
  });

  it("finds multiple tokens", () => {
    const tokens = findPlaceholderTokens(
      "El <<NOMBRE>> y <<APELLIDO>> firmarán",
    );
    expect(tokens).toEqual([
      { start: 3, end: 13 },
      { start: 16, end: 28 },
    ]);
  });

  it("does not match across angle brackets in unrelated text", () => {
    // The regex is non-greedy on the inner [^<>]* class, so unrelated
    // angle brackets don't form a token.
    expect(findPlaceholderTokens("a < b > c <<X>> d")).toEqual([
      { start: 10, end: 15 },
    ]);
  });
});

describe("engulfRange", () => {
  it("identity when there are no spans", () => {
    expect(engulfRange([], 5, 12)).toEqual({
      engStart: 5,
      engEnd: 12,
      widened: false,
    });
  });

  it("does not widen when selection is wholly outside every span", () => {
    expect(engulfRange([{ start: 13, end: 23 }], 4, 12)).toEqual({
      engStart: 4,
      engEnd: 12,
      widened: false,
    });
  });

  it("does not widen when selection exactly spans a token", () => {
    expect(engulfRange([{ start: 13, end: 23 }], 13, 23)).toEqual({
      engStart: 13,
      engEnd: 23,
      widened: false,
    });
  });

  it("engulfs forward when selection ends inside a token", () => {
    // selection "comprador <<NOMB" → 4..18 against token 13..23
    expect(engulfRange([{ start: 13, end: 23 }], 4, 18)).toEqual({
      engStart: 4,
      engEnd: 23,
      widened: true,
    });
  });

  it("engulfs backward when selection starts inside a token", () => {
    expect(engulfRange([{ start: 13, end: 23 }], 17, 30)).toEqual({
      engStart: 13,
      engEnd: 30,
      widened: true,
    });
  });

  it("engulfs across two adjacent tokens in one pass", () => {
    // Norm: "El <<NOMBRE>> y <<APELLIDO>> firmarán"
    //                3..13         16..28
    const spans = [
      { start: 3, end: 13 },
      { start: 16, end: 28 },
    ];
    expect(engulfRange(spans, 7, 20)).toEqual({
      engStart: 3,
      engEnd: 28,
      widened: true,
    });
  });

  it("rejects inverted ranges", () => {
    expect(() => engulfRange([], 10, 5)).toThrow();
  });
});

describe("normToSource", () => {
  it("identity-maps when there are no matches", () => {
    expect(normToSource([], 17)).toBe(17);
  });

  it("subtracts the cumulative delta after a longer replacement", () => {
    // "___" (3) → "<<DATO>>" (8), delta = +5
    const matches = [match(13, "___", "<<DATO>>")];
    expect(normToSource(matches, 22)).toBe(17); // 22 - 5
  });

  it("snaps to the source boundary when offset hits a match boundary", () => {
    const matches = [match(13, "__", "<<NOMBRE>>")]; // norm span 13..23
    expect(normToSource(matches, 13)).toBe(13); // start
    expect(normToSource(matches, 23)).toBe(15); // end (source end of "__")
  });

  it("handles labeled blanks with multi-byte characters", () => {
    // Source raw: "cédula No. ……" (13 UTF-16 units)
    // Replacement: "cédula No. <<NÚMERO DE CÉDULA>>" (31 UTF-16 units), delta +18
    const matches = [
      match(0, "cédula No. ……", "cédula No. <<NÚMERO DE CÉDULA>>", "NÚMERO DE CÉDULA"),
    ];
    expect(normToSource(matches, 40)).toBe(22); // 40 - 18
    expect(normToSource(matches, 50)).toBe(32);
  });
});

describe("applyManualPlaceholder", () => {
  it("wraps the source span in << >> markers", () => {
    const text = "El comprador Juan Pérez firmará el contrato.";
    const out = applyManualPlaceholder(text, 13, 23, "NOMBRE");
    expect(out).toBe("El comprador <<NOMBRE>> firmará el contrato.");
  });

  it("works at start-of-text and end-of-text boundaries", () => {
    expect(applyManualPlaceholder("Hello world", 0, 5, "WORD")).toBe(
      "<<WORD>> world",
    );
    expect(applyManualPlaceholder("Hello world", 6, 11, "WORD")).toBe(
      "Hello <<WORD>>",
    );
  });
});

describe("integration: engulf manual placeholder + map to source", () => {
  // Scenario: doc has been re-processed and contains a previously-marked
  // manual placeholder. Operator drag-selects across it. Engulf (using
  // findPlaceholderTokens against normalized text) catches the manual
  // token; source mapping (using auto-match list only) ignores it
  // because it's not in the auto-match list — and that's correct,
  // because manual placeholders are identical in source and normalized.
  it("engulfs a manual placeholder while source mapping ignores it", () => {
    const normText = "El comprador <<NOMBRE>> firmará el contrato.";
    // No auto-detected matches in this scenario — `<<NOMBRE>>` was a
    // prior manual edit, so it lives in parsed.text already.
    const autoMatches: PlaceholderMatch[] = [];

    // User selects "comprador <<NOM" (4..18). Engulf extends to 23.
    const tokens = findPlaceholderTokens(normText);
    const eng = engulfRange(tokens, 4, 18);
    expect(eng).toEqual({ engStart: 4, engEnd: 23, widened: true });

    // Source mapping with no auto-matches is identity.
    expect(normToSource(autoMatches, eng.engStart)).toBe(4);
    expect(normToSource(autoMatches, eng.engEnd)).toBe(23);
  });
});
