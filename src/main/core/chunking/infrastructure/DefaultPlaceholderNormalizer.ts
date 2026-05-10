import { injectable } from "inversify";
import type { PlaceholderNormalizer } from "../domain/PlaceholderNormalizer";
import { normalizePlaceholders } from "../../../../shared/lib/placeholders";

/**
 * Inversify-binding wrapper around the shared placeholder normalizer.
 * The pattern table + matcher itself lives in
 * `src/shared/lib/placeholders.ts` so the renderer can use the same
 * logic to preview matches before the operator commits to indexing.
 */
@injectable()
export class DefaultPlaceholderNormalizer implements PlaceholderNormalizer {
  normalize(text: string): string {
    return normalizePlaceholders(text);
  }
}
