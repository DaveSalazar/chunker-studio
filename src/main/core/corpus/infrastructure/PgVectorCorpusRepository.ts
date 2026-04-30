import { injectable } from "inversify";
import pg from "pg";
import pgvector from "pgvector/pg";
import type { CorpusRepository, InsertResult } from "../domain/CorpusRepository";
import type { ChunkPayload } from "../domain/CorpusEntities";
import type { SchemaProfile } from "../../../../shared/types";
import { planLayout, quoteIdent, sslConfigFor } from "./pgvectorLayout";

const { Pool } = pg;

/**
 * Manages a small set of cached connection pools — one per
 * databaseUrl. Most users will only ever pass a single URL; the cache
 * just avoids re-doing TLS + auth on every ingest run.
 *
 * Schema is profile-driven. Each profile pins the target table, the
 * text/embedding/article/heading columns, and the document-field that
 * acts as the natural key for replace-by-source semantics.
 */
@injectable()
export class PgVectorCorpusRepository implements CorpusRepository {
  private pools = new Map<string, pg.Pool>();

  private async getPool(databaseUrl: string): Promise<pg.Pool> {
    let pool = this.pools.get(databaseUrl);
    if (pool) return pool;
    pool = new Pool({
      connectionString: databaseUrl,
      max: 4,
      ssl: sslConfigFor(databaseUrl),
    });
    pool.on("connect", async (client) => {
      await pgvector.registerType(client);
    });
    this.pools.set(databaseUrl, pool);
    return pool;
  }

  async ping(databaseUrl: string): Promise<string> {
    const pool = await this.getPool(databaseUrl);
    const result = await pool.query<{ version: string }>("SELECT version()");
    return result.rows[0]?.version ?? "unknown";
  }

  async writeChunks(
    databaseUrl: string,
    profile: SchemaProfile,
    documentFieldValues: Record<string, string>,
    chunks: ChunkPayload[],
  ): Promise<InsertResult> {
    const layout = planLayout(profile, documentFieldValues);
    const table = quoteIdent(profile.table);
    const pool = await this.getPool(databaseUrl);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let deleted = 0;
      if (layout.sourceKey) {
        const sql = `DELETE FROM ${table} WHERE ${quoteIdent(
          layout.sourceKey.column,
        )} = $1`;
        const result = await client.query(sql, [layout.sourceKey.value]);
        deleted = result.rowCount ?? 0;
      }

      let inserted = 0;
      const colNames = layout.columns.map((c) => quoteIdent(c.name)).join(", ");
      const paramsPerRow = layout.columns.length;
      // Postgres allows up to 65 535 bind parameters per statement.
      // Choose a stride that stays well under that even for profiles
      // with many extra constant columns.
      const stride = Math.max(1, Math.floor(2000 / paramsPerRow));
      for (let i = 0; i < chunks.length; i += stride) {
        const slice = chunks.slice(i, i + stride);
        const values: unknown[] = [];
        const placeholders: string[] = [];
        slice.forEach((chunk, idx) => {
          const base = idx * paramsPerRow;
          const row: string[] = [];
          for (let c = 0; c < layout.columns.length; c++) {
            row.push(`$${base + c + 1}`);
            values.push(layout.columns[c].valueFor(chunk));
          }
          placeholders.push(`(${row.join(", ")})`);
        });
        const sql = `INSERT INTO ${table} (${colNames}) VALUES ${placeholders.join(", ")}`;
        const result = await client.query(sql, values);
        inserted += result.rowCount ?? 0;
      }

      await client.query("COMMIT");
      return { deleted, inserted };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {
        /* swallow — original error is more useful */
      });
      throw err;
    } finally {
      client.release();
    }
  }
}
