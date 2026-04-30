import type { SchemaProfile } from "../../../../shared/types";
import type { ChunkPayload } from "./CorpusEntities";

export interface InsertResult {
  /** Rows present for the natural key BEFORE the delete-then-insert (0 when no source key). */
  deleted: number;
  /** Rows inserted by this run. */
  inserted: number;
}

/**
 * Writes chunks into a profile-defined target table. The profile pins
 * the table name, the column map (text/embedding/article/heading), and
 * which document field acts as the natural key for replace-by-source.
 *
 * The contract is intentionally narrow — readers (RAG retrieval) live
 * elsewhere; this app is build-time only.
 */
export interface CorpusRepository {
  /** Quick connectivity check. Resolves with the Postgres `version()`. */
  ping(databaseUrl: string): Promise<string>;

  /**
   * Write `chunks` into the table targeted by `profile`. When the
   * profile defines a source-key field, all existing rows for the same
   * key value are deleted first, all in one transaction.
   *
   * @param documentFieldValues map of profile.documentFields[].key →
   * value the operator entered in the IngestDialog. Used both for the
   * DELETE predicate and the per-row constant columns of every INSERT.
   */
  writeChunks(
    databaseUrl: string,
    profile: SchemaProfile,
    documentFieldValues: Record<string, string>,
    chunks: ChunkPayload[],
  ): Promise<InsertResult>;
}
