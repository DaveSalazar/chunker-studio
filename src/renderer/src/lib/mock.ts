import type { ChunkCardChunk } from "@/components/app/ChunkCard";
import type { ChunkRecord } from "@shared/types";

export const SAMPLE_TEXT = `Art. 1480.- El deudor que se encuentre en mora debe indemnizar al
acreedor los perjuicios que su retardo en el cumplimiento le hubiere
causado, sin perjuicio del derecho del acreedor a exigir el cumplimiento
de la obligación principal.

Art. 1481.- La indemnización comprende el daño emergente y el lucro
cesante, con las limitaciones que establecen los artículos siguientes.

Art. 1482.- En todo caso, las partes pueden convenir el monto de la
indemnización mediante una cláusula penal, sujeta a las reglas del Título
correspondiente.

CAPÍTULO II — DEL CUMPLIMIENTO DE LAS OBLIGACIONES

Art. 1483.- El cumplimiento se hará en el lugar y tiempo señalados por
la convención. A falta de pacto, se entenderá que el cumplimiento debe
realizarse en el domicilio del deudor.`;

export const SAMPLE_CHUNKS: ChunkCardChunk[] = [
  {
    index: 1,
    article: "Art. 1480",
    heading: "CAPÍTULO I — DE LAS OBLIGACIONES",
    text:
      "El deudor que se encuentre en mora debe indemnizar al acreedor los perjuicios que su retardo en el cumplimiento le hubiere causado, sin perjuicio del derecho del acreedor a exigir el cumplimiento de la obligación principal.",
    tokenCount: 62,
    charCount: 234,
  },
  {
    index: 2,
    article: "Art. 1481",
    heading: "CAPÍTULO I — DE LAS OBLIGACIONES",
    text:
      "La indemnización comprende el daño emergente y el lucro cesante, con las limitaciones que establecen los artículos siguientes.",
    tokenCount: 31,
    charCount: 130,
  },
  {
    index: 3,
    article: "Art. 1482",
    heading: "CAPÍTULO I — DE LAS OBLIGACIONES",
    text:
      "En todo caso, las partes pueden convenir el monto de la indemnización mediante una cláusula penal, sujeta a las reglas del Título correspondiente.",
    tokenCount: 35,
    charCount: 153,
  },
  {
    index: 4,
    article: "Art. 1483",
    heading: "CAPÍTULO II — DEL CUMPLIMIENTO DE LAS OBLIGACIONES",
    text:
      "El cumplimiento se hará en el lugar y tiempo señalados por la convención. A falta de pacto, se entenderá que el cumplimiento debe realizarse en el domicilio del deudor.",
    tokenCount: 41,
    charCount: 175,
  },
];

/**
 * Mocked records that mirror what the main process actually returns,
 * including the byte-accurate offsets the SourcePreview needs to
 * highlight the source. Offsets are computed from `SAMPLE_TEXT` via
 * `indexOf` so the story stays in sync if anyone tweaks the wording.
 */
function recordFor(
  index: number,
  article: string,
  heading: string,
  startNeedle: string,
  endBeforeNeedle: string | null,
  tokenCount: number,
): ChunkRecord {
  const start = SAMPLE_TEXT.indexOf(startNeedle);
  const end = endBeforeNeedle
    ? SAMPLE_TEXT.indexOf(endBeforeNeedle)
    : SAMPLE_TEXT.length;
  const text = SAMPLE_TEXT.slice(start, end).trim();
  return {
    index,
    article,
    heading,
    text,
    charCount: text.length,
    tokenCount,
    startOffset: start,
    endOffset: end,
  };
}

export const SAMPLE_CHUNK_RECORDS: ChunkRecord[] = [
  recordFor(1, "Art. 1480", "CAPÍTULO I — DE LAS OBLIGACIONES", "Art. 1480", "Art. 1481", 62),
  recordFor(2, "Art. 1481", "CAPÍTULO I — DE LAS OBLIGACIONES", "Art. 1481", "Art. 1482", 31),
  recordFor(3, "Art. 1482", "CAPÍTULO I — DE LAS OBLIGACIONES", "Art. 1482", "CAPÍTULO II", 35),
  recordFor(4, "Art. 1483", "CAPÍTULO II — DEL CUMPLIMIENTO DE LAS OBLIGACIONES", "Art. 1483", null, 41),
];
