import type { Database as DatabaseInstance, Statement } from "better-sqlite3";

export type AnyStatement = Statement<unknown[], unknown>;

export interface ParsedRow {
  text: string;
  page_count: number | null;
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

export interface SessionStatements {
  getParse: AnyStatement;
  saveParse: AnyStatement;
  getRun: AnyStatement;
  getChunks: AnyStatement;
  saveRun: AnyStatement;
  deleteChunks: AnyStatement;
  insertChunk: AnyStatement;
  updateChunk: AnyStatement;
  touchRun: AnyStatement;
}

export function prepareStatements(db: DatabaseInstance): SessionStatements {
  return {
    getParse: db.prepare(
      `SELECT text, page_count, warnings_json, path, name, extension, unsupported_reason
       FROM parsed_documents WHERE file_hash = ?`,
    ),
    saveParse: db.prepare(
      `INSERT INTO parsed_documents
         (file_hash, path, name, extension, text, page_count, warnings_json,
          unsupported_reason, accessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(file_hash) DO UPDATE SET
         path = excluded.path,
         name = excluded.name,
         extension = excluded.extension,
         text = excluded.text,
         page_count = excluded.page_count,
         warnings_json = excluded.warnings_json,
         unsupported_reason = excluded.unsupported_reason,
         accessed_at = excluded.accessed_at`,
    ),
    getRun: db.prepare(
      `SELECT settings_json, total_tokens, total_chars, strategy, normalized_text,
              estimated_cost_usd
       FROM chunking_runs
       WHERE text_hash = ? AND settings_hash = ?`,
    ),
    getChunks: db.prepare(
      `SELECT chunk_index, article, heading, text, char_count, token_count,
              start_offset, end_offset, manually_edited
       FROM chunks
       WHERE text_hash = ? AND settings_hash = ?
       ORDER BY chunk_index ASC`,
    ),
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
    ),
    deleteChunks: db.prepare(
      `DELETE FROM chunks WHERE text_hash = ? AND settings_hash = ? AND manually_edited = 0`,
    ),
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
    ),
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
    ),
    touchRun: db.prepare(
      `UPDATE chunking_runs SET accessed_at = ? WHERE text_hash = ? AND settings_hash = ?`,
    ),
  };
}
