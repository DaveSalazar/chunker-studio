import type { Database as DatabaseInstance, Statement } from "better-sqlite3";
import type {
  GetParseParams,
  InsertChunkParams,
  RunKey,
  SaveParseParams,
  SaveRunParams,
  TouchRunParams,
  UpdateChunkParams,
} from "./sqliteParams";

export type AnyStatement = Statement<unknown[], unknown>;

export interface ParsedRow {
  text: string;
  page_count: number | null;
  page_offsets_json: string | null;
  warnings_json: string;
  path: string;
  name: string;
  extension: string;
  unsupported_reason: string | null;
}

export interface RunRow {
  settings_json: string;
  total_tokens: number;
  total_chars: number;
  strategy: string;
  normalized_text: string;
  estimated_cost_usd: number;
}

export interface ChunkRow {
  chunk_index: number;
  article: string | null;
  heading: string | null;
  text: string;
  char_count: number;
  token_count: number;
  start_offset: number;
  end_offset: number;
  manually_edited: number;
}

/**
 * Each statement's bind tuple is typed via the second generic. The
 * call site then *must* pass an object that matches the param shape —
 * forgetting a key is a compile error, no longer a "Too few parameter
 * values" runtime surprise.
 */
export interface SessionStatements {
  getParse: Statement<[GetParseParams], unknown>;
  saveParse: Statement<[SaveParseParams], unknown>;
  getRun: Statement<[RunKey], unknown>;
  getChunks: Statement<[RunKey], unknown>;
  saveRun: Statement<[SaveRunParams], unknown>;
  deleteChunks: Statement<[RunKey], unknown>;
  insertChunk: Statement<[InsertChunkParams], unknown>;
  updateChunk: Statement<[UpdateChunkParams], unknown>;
  touchRun: Statement<[TouchRunParams], unknown>;
}

export function prepareStatements(db: DatabaseInstance): SessionStatements {
  return {
    getParse: db.prepare(
      `SELECT text, page_count, page_offsets_json, warnings_json,
              path, name, extension, unsupported_reason
       FROM parsed_documents WHERE file_hash = @fileHash`,
    ) as Statement<[GetParseParams], unknown>,
    saveParse: db.prepare(
      `INSERT INTO parsed_documents
         (file_hash, path, name, extension, text, page_count, page_offsets_json,
          warnings_json, unsupported_reason, accessed_at)
       VALUES (@fileHash, @path, @name, @extension, @text, @pageCount,
               @pageOffsetsJson, @warningsJson, @unsupportedReason, @accessedAt)
       ON CONFLICT(file_hash) DO UPDATE SET
         path = excluded.path,
         name = excluded.name,
         extension = excluded.extension,
         text = excluded.text,
         page_count = excluded.page_count,
         page_offsets_json = excluded.page_offsets_json,
         warnings_json = excluded.warnings_json,
         unsupported_reason = excluded.unsupported_reason,
         accessed_at = excluded.accessed_at`,
    ) as Statement<[SaveParseParams], unknown>,
    getRun: db.prepare(
      `SELECT settings_json, total_tokens, total_chars, strategy, normalized_text,
              estimated_cost_usd
       FROM chunking_runs
       WHERE text_hash = @textHash AND settings_hash = @settingsHash`,
    ) as Statement<[RunKey], unknown>,
    getChunks: db.prepare(
      `SELECT chunk_index, article, heading, text, char_count, token_count,
              start_offset, end_offset, manually_edited
       FROM chunks
       WHERE text_hash = @textHash AND settings_hash = @settingsHash
       ORDER BY chunk_index ASC`,
    ) as Statement<[RunKey], unknown>,
    saveRun: db.prepare(
      `INSERT INTO chunking_runs
         (text_hash, settings_hash, settings_json, total_tokens, total_chars,
          strategy, normalized_text, estimated_cost_usd, accessed_at)
       VALUES (@textHash, @settingsHash, @settingsJson, @totalTokens, @totalChars,
               @strategy, @normalizedText, @estimatedCostUsd, @accessedAt)
       ON CONFLICT(text_hash, settings_hash) DO UPDATE SET
         settings_json = excluded.settings_json,
         total_tokens = excluded.total_tokens,
         total_chars = excluded.total_chars,
         strategy = excluded.strategy,
         normalized_text = excluded.normalized_text,
         estimated_cost_usd = excluded.estimated_cost_usd,
         accessed_at = excluded.accessed_at`,
    ) as Statement<[SaveRunParams], unknown>,
    deleteChunks: db.prepare(
      `DELETE FROM chunks
       WHERE text_hash = @textHash AND settings_hash = @settingsHash
         AND manually_edited = 0`,
    ) as Statement<[RunKey], unknown>,
    insertChunk: db.prepare(
      `INSERT INTO chunks
         (text_hash, settings_hash, chunk_index, article, heading, text,
          char_count, token_count, start_offset, end_offset, manually_edited)
       VALUES (@textHash, @settingsHash, @chunkIndex, @article, @heading, @text,
               @charCount, @tokenCount, @startOffset, @endOffset, @manuallyEdited)
       ON CONFLICT(text_hash, settings_hash, chunk_index) DO UPDATE SET
         article = excluded.article,
         heading = excluded.heading,
         text = excluded.text,
         char_count = excluded.char_count,
         token_count = excluded.token_count,
         start_offset = excluded.start_offset,
         end_offset = excluded.end_offset,
         manually_edited = excluded.manually_edited
       WHERE manually_edited = 0`,
    ) as Statement<[InsertChunkParams], unknown>,
    updateChunk: db.prepare(
      `INSERT INTO chunks
         (text_hash, settings_hash, chunk_index, article, heading, text,
          char_count, token_count, start_offset, end_offset, manually_edited)
       VALUES (@textHash, @settingsHash, @chunkIndex, @article, @heading, @text,
               @charCount, @tokenCount, @startOffset, @endOffset, 1)
       ON CONFLICT(text_hash, settings_hash, chunk_index) DO UPDATE SET
         article = excluded.article,
         heading = excluded.heading,
         text = excluded.text,
         char_count = excluded.char_count,
         token_count = excluded.token_count,
         start_offset = excluded.start_offset,
         end_offset = excluded.end_offset,
         manually_edited = 1`,
    ) as Statement<[UpdateChunkParams], unknown>,
    touchRun: db.prepare(
      `UPDATE chunking_runs
         SET accessed_at = @accessedAt
       WHERE text_hash = @textHash AND settings_hash = @settingsHash`,
    ) as Statement<[TouchRunParams], unknown>,
  };
}
