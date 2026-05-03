export const ChunkingLocator = {
  TextNormalizer: Symbol.for("TextNormalizer"),
  PlaceholderNormalizer: Symbol.for("PlaceholderNormalizer"),
  /** The top-level Chunker bound for callers — currently CompositeChunker. */
  Chunker: Symbol.for("Chunker"),
  /** Component chunkers the dispatcher composes; not consumed directly elsewhere. */
  ArticleAwareChunker: Symbol.for("ArticleAwareChunker"),
  WholeDocumentChunker: Symbol.for("WholeDocumentChunker"),
  TokenCounter: Symbol.for("TokenCounter"),
  ChunkDocumentUseCase: Symbol.for("ChunkDocumentUseCase"),
};
