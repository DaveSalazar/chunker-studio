/**
 * Parse `<<FIELD>>` placeholder markers out of a document body and emit
 * a deduplicated, type-tagged schema. Used by the skeleton extractor
 * (`skeleton.ts`) and by the chunker's pgvector writer to populate the
 * `fields` jsonb column — the desktop app's form-fill UI later renders
 * one input per entry.
 *
 * Type inference is heuristic — keyed on the marker name itself (which
 * the chunker's placeholders.ts already normalizes to a small
 * Spanish-legal vocabulary). Anything we don't recognize falls through
 * to "text" and the form renders a free-text input.
 *
 * Pure function, no IO. Tested directly via vitest.
 */

export interface TemplateFieldSpec {
  /** Marker name without the angle brackets, e.g. "NÚMERO DE CÉDULA". */
  name: string;
  /**
   * Heuristic type tag the form-fill UI uses to pick a validator and
   * input widget. Not stored on the marker itself — derived from `name`
   * so the inference can evolve without re-ingestion.
   */
  type: TemplateFieldType;
}

export type TemplateFieldType =
  | "text"
  | "person"
  | "cedula_ec"
  | "ruc_ec"
  | "passport"
  | "email"
  | "phone"
  | "money"
  | "date"
  | "day"
  | "month"
  | "year"
  | "address"
  | "vehicle_attr"
  | "doc_ref"
  | "data";

const PLACEHOLDER_RE = /<<([^>]+)>>/g;

// Walked top-to-bottom in `inferType`; first match wins. Keep more-specific
// names earlier when overlap is possible (e.g. NÚMERO DE CÉDULA before
// any future generic NÚMERO entry).
const RULES: Array<[RegExp, TemplateFieldType]> = [
  [/^NÚMERO DE CÉDULA$/, "cedula_ec"],
  [/^RUC$/, "ruc_ec"],
  [/^NÚMERO DE PASAPORTE$/, "passport"],
  [/^CORREO ELECTRÓNICO$/, "email"],
  [/^TELÉFONO$/, "phone"],
  [/^MONTO$/, "money"],
  [/^FECHA$/, "date"],
  [/^DÍA$/, "day"],
  [/^MES$/, "month"],
  [/^AÑO$/, "year"],
  [/^NOMBRE COMPLETO$/, "person"],
  [/^(NOMBRE DEL JUZGADO|NOMBRE DEL NOTARIO|NOMBRE DE LA COMPAÑÍA|NOMBRE DEL BANCO|RAZÓN SOCIAL|ABOGADO PATROCINADOR)$/, "person"],
  [/^(DIRECCIÓN|AVENIDA|CALLE|EDIFICIO|BARRIO|PISO|LOTIZACIÓN|SECTOR|PARROQUIA|CANTÓN|PROVINCIA|CIUDAD|PAÍS|MANZANA|LOTE|SUPERFICIE|LINDERO( NORTE| SUR| ESTE| OESTE)?)$/, "address"],
  [/^(MARCA DEL VEHÍCULO|MODELO DEL VEHÍCULO|CLASE DEL VEHÍCULO|COLOR DEL VEHÍCULO|NÚMERO DE PLACA|NÚMERO DE MOTOR|NÚMERO DE CHASIS|CILINDRAJE)$/, "vehicle_attr"],
  [/^(NÚMERO DE FACTURA|NÚMERO DE CUENTA|NÚMERO DE RESOLUCIÓN|NÚMERO DE EXPEDIENTE|NÚMERO DE CAUSA|NÚMERO DE ARTÍCULO|NÚMERO DE CLÁUSULA|MATRÍCULA)$/, "doc_ref"],
  [/^DATO$/, "data"],
];

export function inferType(name: string): TemplateFieldType {
  for (const [re, type] of RULES) if (re.test(name)) return type;
  return "text";
}

/**
 * Extract every `<<FIELD>>` from `body`, dedupe by name (preserving
 * first-occurrence order), and tag each with a heuristic type. The
 * order of returned fields matches the order the markers appear in the
 * body — useful when the form-fill UI wants to render them in document
 * order rather than alphabetical.
 */
export function extractTemplateFields(body: string): TemplateFieldSpec[] {
  if (!body) return [];
  const seen = new Set<string>();
  const out: TemplateFieldSpec[] = [];
  for (const m of body.matchAll(PLACEHOLDER_RE)) {
    const name = m[1].trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, type: inferType(name) });
  }
  return out;
}
