import { describe, expect, it } from "vitest";
import {
  buildSkeleton,
  extractCitationsFrom,
  isHeading,
} from "./skeleton";

const SAMPLE = `\
SEÑOR JUEZ DE LA UNIDAD JUDICIAL DE TRÁNSITO CON SEDE EN EL CANTÓN <<CANTÓN>>:

DEL ACUSADOR:
Yo, <<NOMBRE COMPLETO>>, portador de la cédula <<NÚMERO DE CÉDULA>>, de
estado civil <<ESTADO CIVIL>>, de profesión <<PROFESIÓN>>, domiciliado
en la Av <<AVENIDA>>.

DE LOS PROCESADOS:
Los nombres son: <<NOMBRE COMPLETO>>, conductor del vehículo marca
<<MARCA DEL VEHÍCULO>>, de Placas <<NÚMERO DE PLACA>>.

INFRACCIÓN CAUSADA.- El delito acusado es el tipificado en el Artículo
<<NÚMERO DE ARTÍCULO>> del COIP. Los delitos de tránsito están en los
artículos 376 al 382 del Código Orgánico Integral Penal, y las
infracciones desde el Art. 383 al 386. Para la víctima, el Art. 11 CRE.

PRETENSIÓN.- Que se imponga la pena al procesado <<NOMBRE COMPLETO>>.

PRIMERA.- COMPARECIENTES:
Los cónyuges <<NOMBRE COMPLETO>> y <<NOMBRE COMPLETO>>.
`;

describe("isHeading", () => {
  it("matches standalone-line headings", () => {
    expect(isHeading("DEL ACUSADOR:")).toBe(true);
    expect(isHeading("RELACIÓN DE LOS HECHOS:")).toBe(true);
    expect(isHeading("PRETENSIÓN.-")).toBe(true);
    expect(isHeading("PRIMERA.- COMPARECIENTES:")).toBe(true);
  });

  it("rejects lowercase or mid-sentence text", () => {
    expect(isHeading("Yo, Juan,")).toBe(false);
    expect(isHeading("nombres y apellidos:")).toBe(false);
  });
});

describe("extractCitationsFrom", () => {
  it("resolves abbreviations and full-name codes", () => {
    const cites = extractCitationsFrom(
      "Artículo 376 del COIP. También el Art. 11 CRE. " +
        "Y el artículo 1453 del Código Civil. Y el Art. 999 sin código.",
    );
    const keys = cites.map((c) => c.key);
    expect(keys).toContain("COIP-376");
    expect(keys).toContain("CRE-11");
    expect(keys).toContain("CC-1453");
    expect(keys).toContain("?-999");
  });

  it("stops the lookforward at the next Art / sentence boundary", () => {
    // "Art. 383 al 386. Para la víctima, el Art. 11 CRE." used to grab
    // CRE for 383 because the lookforward window ran past the sentence
    // boundary. Now it stops at the period.
    const cites = extractCitationsFrom(
      "los artículos 376 al 382 del Código Orgánico Integral Penal, " +
        "y desde el Art. 383 al 386. Para la víctima, el Art. 11 CRE.",
    );
    const keys = new Set(cites.map((c) => c.key));
    expect(keys.has("COIP-376")).toBe(true);
    expect(keys.has("?-383")).toBe(true);
    expect(keys.has("CRE-11")).toBe(true);
  });
});

describe("buildSkeleton", () => {
  it("captures all heading variants and dedupes fields/citations", () => {
    const skel = buildSkeleton(SAMPLE);
    const headings = skel.sections.map((s) => s.heading);
    expect(headings).toContain("DEL ACUSADOR:");
    expect(headings).toContain("DE LOS PROCESADOS:");
    // Inline headings (heading + tail prose on the same line):
    expect(headings.some((h) => h.startsWith("INFRACCIÓN CAUSADA.-"))).toBe(true);
    expect(headings.some((h) => h.startsWith("PRETENSIÓN.-"))).toBe(true);
    expect(headings.some((h) => h.includes("COMPARECIENTES"))).toBe(true);

    // NOMBRE COMPLETO appears 4+ times but the flat list dedups it.
    const fieldNames = skel.fields.map((f) => f.name);
    expect(fieldNames.filter((n) => n === "NOMBRE COMPLETO").length).toBe(1);
    expect(fieldNames).toContain("NÚMERO DE CÉDULA");
    expect(fieldNames).toContain("NÚMERO DE PLACA");

    const citationKeys = skel.citations.map((c) => c.key);
    expect(citationKeys).toContain("COIP-376");
    expect(citationKeys).toContain("CRE-11");
    // Order-preserving dedup: 376 (which appears earlier in the prose)
    // shows up before 11.
    expect(citationKeys.indexOf("COIP-376")).toBeLessThan(
      citationKeys.indexOf("CRE-11"),
    );
  });
});
