/**
 * Rewrites the in-template blanks operators leave in `.docx` minutas
 * (`___`, `NOMBRE: ___`, `fecha __ de __ de 20__`) into the
 * `<<NOMBRE>>` / `<<FECHA>>` form the backend's chat system prompt
 * already knows how to surface for downstream highlighting in the
 * generated DOCX.
 *
 * Pure function, idempotent. Inputs that contain no blanks pass through
 * unchanged.
 */
export interface PlaceholderNormalizer {
  normalize(text: string): string;
}
