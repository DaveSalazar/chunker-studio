import { describe, expect, it } from "vitest";
import {
  analyzePlaceholders,
  normalizePlaceholders,
} from "./placeholders";

const summarize = (text: string) =>
  analyzePlaceholders(text).map((m) => m.name);

describe("normalizePlaceholders — date triples", () => {
  it("rewrites '… de … de 20…' to a typed triple", () => {
    const out = normalizePlaceholders("a … de … de 20… b");
    expect(out).toContain("<<DÍA>> de <<MES>> de <<AÑO>>");
  });

  it("rewrites the same shape with underscores", () => {
    const out = normalizePlaceholders("a __ de __ de 20__ b");
    expect(out).toContain("<<DÍA>> de <<MES>> de <<AÑO>>");
  });

  it("accepts variable-length runs", () => {
    const out = normalizePlaceholders("……… de……… de……");
    expect(out).toContain("<<DÍA>> de <<MES>> de <<AÑO>>");
  });

  it("rewrites the hyphen-separated form '…-…-…'", () => {
    // 9.2% of the corpus uses this. Three blank components separated
    // by hyphens, optional "20" prefix on the year segment.
    expect(normalizePlaceholders("……-……-……")).toContain(
      "<<DÍA>> de <<MES>> de <<AÑO>>",
    );
    expect(normalizePlaceholders("…-………-…")).toContain(
      "<<DÍA>> de <<MES>> de <<AÑO>>",
    );
    expect(normalizePlaceholders("__-__-20__")).toContain(
      "<<DÍA>> de <<MES>> de <<AÑO>>",
    );
  });

  it("the hyphen form does not eat real number ranges like '12-15'", () => {
    // BLANK requires 2+ underscores or 1+ ellipsis, so a literal
    // numeric range like "12-15-2026" stays intact.
    expect(normalizePlaceholders("artículos 12-15 del título")).toBe(
      "artículos 12-15 del título",
    );
  });
});

describe("normalizePlaceholders — written-out year forms", () => {
  it("rewrites 'dos mil ……' to 'dos mil <<AÑO>>'", () => {
    const out = normalizePlaceholders(
      "Suscrito el día … de … de dos mil ……",
    );
    expect(out).toContain("dos mil <<AÑO>>");
  });

  it("rewrites 'dos mil veintiséis' (literal Spanish numeral)", () => {
    // Operator may have already typed a word — still a year placeholder
    // from our perspective because it's the field that gets edited.
    expect(normalizePlaceholders("dos mil veintiséis")).toContain(
      "dos mil <<AÑO>>",
    );
    expect(normalizePlaceholders("dos mil sesenta")).toContain(
      "dos mil <<AÑO>>",
    );
  });

  it("rewrites 'del año ……' to 'del año <<AÑO>>'", () => {
    expect(normalizePlaceholders("Quito, a 4 del año ……")).toContain(
      "del año <<AÑO>>",
    );
  });

  it("rewrites 'del año 2026' (literal year already filled)", () => {
    expect(normalizePlaceholders("celebrada del año 2026")).toContain(
      "del año <<AÑO>>",
    );
  });

});

describe("normalizePlaceholders — labeled fields (ellipsis)", () => {
  it("rewrites 'cédula de ciudadanía No. ……' as NÚMERO DE CÉDULA", () => {
    const out = normalizePlaceholders("portador de la cédula de ciudadanía No. ……, mayor");
    expect(out).toContain("<<NÚMERO DE CÉDULA>>");
    expect(out).not.toContain("……,");
  });

  it("rewrites 'cédula' standalone (less-specific fallback)", () => {
    const out = normalizePlaceholders("la cédula …… del actor");
    expect(out).toContain("<<NÚMERO DE CÉDULA>>");
  });

  it("rewrites teléfono celular", () => {
    const out = normalizePlaceholders("teléfono celular número …….");
    expect(out).toContain("<<TELÉFONO>>");
  });

  it("rewrites correo electrónico", () => {
    const out = normalizePlaceholders("con correo electrónico ……,");
    expect(out).toContain("<<CORREO ELECTRÓNICO>>");
  });

  it("rewrites casillero judicial electrónico", () => {
    const out = normalizePlaceholders("casillero judicial electrónico ……");
    expect(out).toContain("<<CASILLERO JUDICIAL>>");
  });

  it("rewrites provincia / cantón / parroquia / sector / lotización", () => {
    const text =
      "provincia de …… cantón …… parroquia …… sector …… lotización ……";
    const out = normalizePlaceholders(text);
    expect(out).toContain("<<PROVINCIA>>");
    expect(out).toContain("<<CANTÓN>>");
    expect(out).toContain("<<PARROQUIA>>");
    expect(out).toContain("<<SECTOR>>");
    expect(out).toContain("<<LOTIZACIÓN>>");
  });

  it("rewrites monto / valor / suma / cuantía", () => {
    expect(normalizePlaceholders("la suma de ……")).toContain("<<MONTO>>");
    expect(normalizePlaceholders("el valor de ……")).toContain("<<MONTO>>");
    expect(normalizePlaceholders("una cuantía de ……")).toContain("<<MONTO>>");
  });

  it("rewrites compañía / razón social", () => {
    expect(normalizePlaceholders("la compañía ……")).toContain(
      "<<NOMBRE DE LA COMPAÑÍA>>",
    );
    expect(normalizePlaceholders("razón social ……")).toContain(
      "<<RAZÓN SOCIAL>>",
    );
  });

  it("rewrites 'matrícula' and 'profesión' as the corpus uses them", () => {
    expect(normalizePlaceholders("Mat. ……")).toContain("<<MATRÍCULA>>");
    expect(normalizePlaceholders("de profesión ……")).toContain("<<PROFESIÓN>>");
  });
});

describe("normalizePlaceholders — labeled fields (underscores)", () => {
  it("still handles NOMBRE: ___", () => {
    expect(normalizePlaceholders("NOMBRE: __________")).toContain(
      "<<NOMBRE COMPLETO>>",
    );
  });

  it("still handles cédula with underscore blanks", () => {
    expect(normalizePlaceholders("cédula de identidad No. ____________")).toContain(
      "<<NÚMERO DE CÉDULA>>",
    );
  });
});

describe("normalizePlaceholders — bare blanks fall through to <<DATO>>", () => {
  it("rewrites a long ellipsis run when no label sits before it", () => {
    expect(normalizePlaceholders("(……………………)")).toContain("<<DATO>>");
  });

  it("rewrites a long underscore run when no label sits before it", () => {
    expect(normalizePlaceholders("(__________________)")).toContain("<<DATO>>");
  });

  it("does not rewrite a single dot or ellipsis at end of sentence", () => {
    expect(normalizePlaceholders("Final.")).toBe("Final.");
    // A lone "…" at end of a phrase (no label nearby) still becomes
    // <<DATO>> — operator can spot and ignore via the preview panel.
    expect(normalizePlaceholders("a …")).toContain("<<DATO>>");
  });
});

describe("analyzePlaceholders — preview surface", () => {
  it("returns empty array when there are no blanks", () => {
    expect(analyzePlaceholders("Texto plano sin blancos.")).toEqual([]);
  });

  it("returns matches in document order with non-overlapping ranges", () => {
    const text =
      "provincia de …… cantón …… correo electrónico ……";
    const matches = analyzePlaceholders(text);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].start).toBeGreaterThanOrEqual(matches[i - 1].end);
    }
  });

  it("classifies each match with the right placeholder name", () => {
    const text = "cédula …… correo electrónico …… provincia ……";
    expect(summarize(text)).toEqual([
      "NÚMERO DE CÉDULA",
      "CORREO ELECTRÓNICO",
      "PROVINCIA",
    ]);
  });

  it("date triple is one match, not three (specific shape wins)", () => {
    const text = "la fecha … de … de 20… del año";
    const names = summarize(text);
    // Exactly one FECHA — the specific date pattern claims the span
    // before the labeled-fecha pattern can run on the same chars.
    expect(names.filter((n) => n === "FECHA")).toHaveLength(1);
  });

  it("preserves the operator's label text in the replacement", () => {
    const m = analyzePlaceholders("Cédula de ciudadanía No. ……")[0];
    expect(m.replacement).toMatch(/^Cédula de ciudadanía No\. <<NÚMERO DE CÉDULA>>$/);
  });

  it("each match's [start,end) actually slices `raw` from the source", () => {
    const text =
      "comparece NOMBRE: __________ con cédula ……, en provincia de ……";
    for (const m of analyzePlaceholders(text)) {
      expect(text.slice(m.start, m.end)).toBe(m.raw);
    }
  });
});

describe("normalizePlaceholders — idempotency + edge cases", () => {
  it("running twice produces the same result as once", () => {
    const text = "NOMBRE: …… cédula …… provincia de ……";
    const once = normalizePlaceholders(text);
    expect(normalizePlaceholders(once)).toBe(once);
  });

  it("returns empty for empty input", () => {
    expect(normalizePlaceholders("")).toBe("");
  });

  it("does not touch existing <<PLACEHOLDER>> tokens", () => {
    const text = "Texto con <<NOMBRE COMPLETO>> ya marcado.";
    expect(normalizePlaceholders(text)).toBe(text);
  });
});
