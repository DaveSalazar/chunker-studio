import { describe, expect, it } from "vitest";
import "reflect-metadata";
import { DefaultPlaceholderNormalizer } from "./DefaultPlaceholderNormalizer";

const norm = new DefaultPlaceholderNormalizer();

describe("DefaultPlaceholderNormalizer", () => {
  describe("date triples", () => {
    it("rewrites '__ de __ de 20__' to <<DÍA>> de <<MES>> de <<AÑO>>", () => {
      const input = "En la ciudad de Quito, a __ de __ de 20__, comparece...";
      const out = norm.normalize(input);
      expect(out).toContain("<<DÍA>> de <<MES>> de <<AÑO>>");
    });

    it("falls through (to <<DATO>>) when prose interrupts the date shape", () => {
      // The simple shape regex deliberately requires no extra words
      // between the underscored components. "días del mes de" inputs
      // get surfaced as bare-blank <<DATO>> tokens for the operator to
      // review — better than silently mis-rewriting.
      const input = "a los ___ días del mes de ___ de 20__";
      const out = norm.normalize(input);
      expect(out).toContain("<<DATO>>");
    });

    it("accepts the alternate 'del' separator before the year", () => {
      const input = "____ de ____ del 20__";
      expect(norm.normalize(input)).toContain("<<DÍA>> de <<MES>> de <<AÑO>>");
    });

    it("does not over-consume — text after the date stays intact", () => {
      const input = "fecha __ de __ de 20__, en la notaría";
      const out = norm.normalize(input);
      expect(out).toContain(", en la notaría");
    });
  });

  describe("labeled blanks", () => {
    it("rewrites NOMBRE: ___", () => {
      const out = norm.normalize("NOMBRE: ___________________");
      expect(out).toBe("NOMBRE: <<NOMBRE COMPLETO>>");
    });

    it("rewrites a 'cédula de identidad' label", () => {
      const out = norm.normalize("cédula de identidad ____________");
      expect(out).toContain("<<NÚMERO DE CÉDULA>>");
    });

    it("preserves the original label casing", () => {
      const out = norm.normalize("Dirección: ____________");
      expect(out).toBe("Dirección: <<DIRECCIÓN>>");
    });

    it("rewrites multiple distinct labels in one pass", () => {
      const input = [
        "NOMBRE: __________",
        "CÉDULA: __________",
        "DIRECCIÓN: __________",
        "TELÉFONO: __________",
      ].join("\n");
      const out = norm.normalize(input);
      expect(out).toContain("<<NOMBRE COMPLETO>>");
      expect(out).toContain("<<NÚMERO DE CÉDULA>>");
      expect(out).toContain("<<DIRECCIÓN>>");
      expect(out).toContain("<<TELÉFONO>>");
    });

    it("rewrites correo / email variants", () => {
      expect(norm.normalize("Correo electrónico: ___________")).toContain(
        "<<CORREO ELECTRÓNICO>>",
      );
      expect(norm.normalize("e-mail: ___________")).toContain("<<CORREO ELECTRÓNICO>>");
    });
  });

  describe("bare blanks (fallback)", () => {
    it("rewrites a standalone underscore run as <<DATO>>", () => {
      // No label nearby — the bare-blank fallback applies.
      const out = norm.normalize("comparecientes ____________________");
      expect(out).toContain("<<DATO>>");
    });

    it("does NOT rewrite a single underscore", () => {
      // Single _ is often a typesetting artifact, not a fillable blank.
      expect(norm.normalize("foo _ bar")).toBe("foo _ bar");
    });

    it("does NOT rewrite two underscores", () => {
      // Threshold is 3+ to avoid collapsing real text like "ID__001".
      expect(norm.normalize("ID__001")).toBe("ID__001");
    });
  });

  describe("idempotency", () => {
    it("running twice produces the same result as once", () => {
      const input = "NOMBRE: ___ — fecha __ de __ de 20__ — extra ____";
      const once = norm.normalize(input);
      const twice = norm.normalize(once);
      expect(twice).toBe(once);
    });

    it("a string with no blanks passes through unchanged", () => {
      const input = "Texto sin blancos ni placeholders.";
      expect(norm.normalize(input)).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      expect(norm.normalize("")).toBe("");
    });

    it("does not touch existing <<PLACEHOLDER>> tokens", () => {
      const input = "Texto con <<NOMBRE>> ya marcado y _____ blanks adicionales.";
      const out = norm.normalize(input);
      expect(out).toContain("<<NOMBRE>>");
      expect(out).toContain("<<DATO>>");
    });
  });
});
