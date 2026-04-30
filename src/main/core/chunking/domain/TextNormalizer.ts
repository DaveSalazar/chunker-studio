export interface NormalizeOptions {
  dehyphenate: boolean;
}

export interface TextNormalizer {
  normalize(text: string, options: NormalizeOptions): string;
}
