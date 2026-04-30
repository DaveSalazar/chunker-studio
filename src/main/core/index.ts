import "reflect-metadata";
import { Container } from "inversify";

// FileSystem
import { FileSystemLocator } from "./filesystem/domain/FileSystemLocator";
import type { FileSystemRepository } from "./filesystem/domain/FileSystemRepository";
import { NodeFileSystemRepository } from "./filesystem/infrastructure/NodeFileSystemRepository";
import { OpenFileDialogUseCase } from "./filesystem/application/OpenFileDialogUseCase";
import { ReadFileBytesUseCase } from "./filesystem/application/ReadFileBytesUseCase";
import { StatFileUseCase } from "./filesystem/application/StatFileUseCase";
import { PickFolderUseCase } from "./filesystem/application/PickFolderUseCase";
import { ListFolderUseCase } from "./filesystem/application/ListFolderUseCase";

// Parsing
import { ParsingLocator } from "./parsing/domain/ParsingLocator";
import type { DocumentParser, DocumentParserRegistry } from "./parsing/domain/DocumentParser";
import {
  InMemoryDocumentParserRegistry,
  ParserToken,
} from "./parsing/infrastructure/InMemoryDocumentParserRegistry";
import { TextDocumentParser } from "./parsing/infrastructure/TextDocumentParser";
import { DocxDocumentParser } from "./parsing/infrastructure/DocxDocumentParser";
import { PdfDocumentParser } from "./parsing/infrastructure/PdfDocumentParser";
import { ParseDocumentUseCase } from "./parsing/application/ParseDocumentUseCase";

// Chunking
import { ChunkingLocator } from "./chunking/domain/ChunkingLocator";
import type { TextNormalizer } from "./chunking/domain/TextNormalizer";
import type { Chunker } from "./chunking/domain/Chunker";
import type { TokenCounter } from "./chunking/domain/TokenCounter";
import { DefaultTextNormalizer } from "./chunking/infrastructure/DefaultTextNormalizer";
import { ArticleAwareChunker } from "./chunking/infrastructure/ArticleAwareChunker";
import { TiktokenCounter } from "./chunking/infrastructure/TiktokenCounter";
import { ChunkDocumentUseCase } from "./chunking/application/ChunkDocumentUseCase";

// Config
import { ConfigLocator } from "./config/domain/ConfigLocator";
import type { ConfigRepository } from "./config/domain/ConfigRepository";
import { FileConfigRepository } from "./config/infrastructure/FileConfigRepository";
import { GetConfigUseCase } from "./config/application/GetConfigUseCase";
import { UpdateConfigUseCase } from "./config/application/UpdateConfigUseCase";

// Embedding
import { EmbeddingLocator } from "./embedding/domain/EmbeddingLocator";
import type { EmbeddingProvider } from "./embedding/domain/EmbeddingProvider";
import type { EmbeddingProviderRegistry } from "./embedding/domain/EmbeddingProviderRegistry";
import { OpenAIEmbeddingProvider } from "./embedding/infrastructure/OpenAIEmbeddingProvider";
import { OllamaEmbeddingProvider } from "./embedding/infrastructure/OllamaEmbeddingProvider";
import { StaticEmbeddingProviderRegistry } from "./embedding/infrastructure/StaticEmbeddingProviderRegistry";

// Corpus storage
import { CorpusLocator } from "./corpus/domain/CorpusLocator";
import type { CorpusRepository } from "./corpus/domain/CorpusRepository";
import { PgVectorCorpusRepository } from "./corpus/infrastructure/PgVectorCorpusRepository";
import { TestConnectionUseCase } from "./corpus/application/TestConnectionUseCase";

// Ingestion (cross-feature orchestrator)
import { IngestionLocator } from "./ingestion/domain/IngestionLocator";
import { IngestDocumentUseCase } from "./ingestion/application/IngestDocumentUseCase";

// Session cache
import { SessionLocator } from "./session/domain/SessionLocator";
import type { SessionRepository } from "./session/domain/SessionRepository";
import { SqliteSessionRepository } from "./session/infrastructure/SqliteSessionRepository";

const AppContainer = new Container();

// FileSystem
AppContainer.bind<FileSystemRepository>(FileSystemLocator.FileSystemRepository)
  .to(NodeFileSystemRepository)
  .inSingletonScope();
AppContainer.bind<OpenFileDialogUseCase>(FileSystemLocator.OpenFileDialogUseCase).to(OpenFileDialogUseCase);
AppContainer.bind<ReadFileBytesUseCase>(FileSystemLocator.ReadFileBytesUseCase).to(ReadFileBytesUseCase);
AppContainer.bind<StatFileUseCase>(FileSystemLocator.StatFileUseCase).to(StatFileUseCase);
AppContainer.bind<PickFolderUseCase>(FileSystemLocator.PickFolderUseCase).to(PickFolderUseCase);
AppContainer.bind<ListFolderUseCase>(FileSystemLocator.ListFolderUseCase).to(ListFolderUseCase);

// Parsing — every parser binds against the multi-inject token so the
// registry sees them all without a hard-coded list.
AppContainer.bind<DocumentParser>(ParserToken).to(TextDocumentParser).inSingletonScope();
AppContainer.bind<DocumentParser>(ParserToken).to(DocxDocumentParser).inSingletonScope();
AppContainer.bind<DocumentParser>(ParserToken).to(PdfDocumentParser).inSingletonScope();
AppContainer.bind<DocumentParserRegistry>(ParsingLocator.DocumentParserRegistry)
  .to(InMemoryDocumentParserRegistry)
  .inSingletonScope();
AppContainer.bind<ParseDocumentUseCase>(ParsingLocator.ParseDocumentUseCase).to(ParseDocumentUseCase);

// Chunking
AppContainer.bind<TextNormalizer>(ChunkingLocator.TextNormalizer)
  .to(DefaultTextNormalizer)
  .inSingletonScope();
AppContainer.bind<TokenCounter>(ChunkingLocator.TokenCounter).to(TiktokenCounter).inSingletonScope();
AppContainer.bind<Chunker>(ChunkingLocator.Chunker).to(ArticleAwareChunker).inSingletonScope();
AppContainer.bind<ChunkDocumentUseCase>(ChunkingLocator.ChunkDocumentUseCase).to(ChunkDocumentUseCase);

// Config
AppContainer.bind<ConfigRepository>(ConfigLocator.ConfigRepository)
  .to(FileConfigRepository)
  .inSingletonScope();
AppContainer.bind<GetConfigUseCase>(ConfigLocator.GetConfigUseCase).to(GetConfigUseCase);
AppContainer.bind<UpdateConfigUseCase>(ConfigLocator.UpdateConfigUseCase).to(UpdateConfigUseCase);

// Embedding — both providers live in the container; the registry picks
// one based on the profile's embedding.providerId at ingest time.
AppContainer.bind<EmbeddingProvider>(EmbeddingLocator.OpenAIEmbeddingProvider)
  .to(OpenAIEmbeddingProvider)
  .inSingletonScope();
AppContainer.bind<EmbeddingProvider>(EmbeddingLocator.OllamaEmbeddingProvider)
  .to(OllamaEmbeddingProvider)
  .inSingletonScope();
AppContainer.bind<EmbeddingProviderRegistry>(EmbeddingLocator.EmbeddingProviderRegistry)
  .to(StaticEmbeddingProviderRegistry)
  .inSingletonScope();

// Corpus storage
AppContainer.bind<CorpusRepository>(CorpusLocator.CorpusRepository)
  .to(PgVectorCorpusRepository)
  .inSingletonScope();
AppContainer.bind<TestConnectionUseCase>(CorpusLocator.TestConnectionUseCase).to(
  TestConnectionUseCase,
);

// Ingestion
AppContainer.bind<IngestDocumentUseCase>(IngestionLocator.IngestDocumentUseCase).to(
  IngestDocumentUseCase,
);

// Session cache
AppContainer.bind<SessionRepository>(SessionLocator.SessionRepository)
  .to(SqliteSessionRepository)
  .inSingletonScope();

export {
  AppContainer,
  FileSystemLocator,
  ParsingLocator,
  ChunkingLocator,
  ConfigLocator,
  EmbeddingLocator,
  CorpusLocator,
  IngestionLocator,
  SessionLocator,
};
