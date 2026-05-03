import { describe, expect, it } from "vitest";
import { fileNameToTemplateTitle } from "./fileNameToTemplateTitle";

describe("fileNameToTemplateTitle", () => {
  describe("kind + branch reordering", () => {
    it("surfaces a leading minuta and parenthesizes the trailing branch", () => {
      // Canonical example from the corpus: dashed slug → readable title.
      expect(
        fileNameToTemplateTitle("aclaratoria-y-rectificatoria-minuta-notarial.docx"),
      ).toBe("Minuta aclaratoria y rectificatoria (notarial)");
    });

    it("works without a trailing branch marker", () => {
      expect(fileNameToTemplateTitle("aclaratoria-y-rectificatoria-minuta.doc")).toBe(
        "Minuta aclaratoria y rectificatoria",
      );
    });

    it("works without a kind word — falls back to descriptive prose", () => {
      expect(fileNameToTemplateTitle("acta-de-reconocimiento-de-firma.doc")).toBe(
        "Acta de reconocimiento de firma",
      );
    });

    it("recognizes 'demanda' as a kind", () => {
      expect(fileNameToTemplateTitle("demanda-divorcio-mutuo-acuerdo.docx")).toBe(
        "Demanda divorcio mutuo acuerdo",
      );
    });

    it("recognizes 'contrato' + 'comercial' branch", () => {
      expect(
        fileNameToTemplateTitle("compraventa-de-vehiculo-contrato-comercial.docx"),
      ).toBe("Contrato compraventa de vehiculo (comercial)");
    });

    it("handles plain underscores as separators", () => {
      expect(fileNameToTemplateTitle("acuerdo_de_jubilacion_patronal.doc")).toBe(
        "Acuerdo de jubilacion patronal",
      );
    });
  });

  describe("extension stripping", () => {
    it("strips .docx", () => {
      expect(fileNameToTemplateTitle("foo.docx")).toBe("Foo");
    });

    it("strips .doc, .pdf, .txt, .md", () => {
      expect(fileNameToTemplateTitle("foo.doc")).toBe("Foo");
      expect(fileNameToTemplateTitle("foo.pdf")).toBe("Foo");
      expect(fileNameToTemplateTitle("foo.txt")).toBe("Foo");
      expect(fileNameToTemplateTitle("foo.md")).toBe("Foo");
    });

    it("doesn't strip an unknown extension", () => {
      // .rtf isn't on the list, but the chunker doesn't parse it either.
      // Predictability beats over-eager stripping for unfamiliar formats.
      expect(fileNameToTemplateTitle("foo.rtf")).toBe("Foo.rtf");
    });
  });

  describe("edge cases", () => {
    it("returns empty for empty input", () => {
      expect(fileNameToTemplateTitle("")).toBe("");
    });

    it("returns empty when only an extension is present", () => {
      expect(fileNameToTemplateTitle(".docx")).toBe("");
    });

    it("falls back to the lone branch word when no kind / rest survives", () => {
      expect(fileNameToTemplateTitle("notarial.docx")).toBe("notarial");
    });

    it("collapses whitespace runs in the middle", () => {
      expect(fileNameToTemplateTitle("foo--bar___baz.docx")).toBe("Foo bar baz");
    });
  });
});
