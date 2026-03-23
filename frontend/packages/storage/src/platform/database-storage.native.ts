import { open } from "@op-engineering/op-sqlite";
import type {
  Database,
  DatabaseOptions,
  IDatabaseStorage,
  Transaction,
} from "../types";
import { runMigrations } from "./run-migrations";

function wrapConnection(
  conn: ReturnType<typeof open>,
): Database {
  const db: Database = {
    async execute(sql: string, params?: unknown[]): Promise<void> {
      await conn.executeAsync(sql, params);
    },

    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const result = await conn.executeAsync(sql, params);
      return result.rows as T[];
    },

    async executeBatch(
      statements: Array<{ sql: string; params?: unknown[] }>,
    ): Promise<void> {
      await conn.executeBatch(statements);
    },

    async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
      await conn.executeAsync("BEGIN TRANSACTION");
      try {
        const tx: Transaction = {
          async execute(sql: string, params?: unknown[]) {
            await conn.executeAsync(sql, params);
          },
          async query<R>(sql: string, params?: unknown[]) {
            const result = await conn.executeAsync(sql, params);
            return result.rows as R[];
          },
        };
        const result = await fn(tx);
        await conn.executeAsync("COMMIT");
        return result;
      } catch (error) {
        await conn.executeAsync("ROLLBACK");
        throw error;
      }
    },
  };

  return db;
}

export function createDatabaseStorage(): IDatabaseStorage {
  const databases = new Map<
    string,
    { db: Database; conn: ReturnType<typeof open> }
  >();

  return {
    getDatabase(options: DatabaseOptions): Database {
      const existing = databases.get(options.name);
      if (existing) return existing.db;

      const conn = open({ name: `${options.name}.db` });
      conn.execute("PRAGMA journal_mode = WAL");
      conn.execute("PRAGMA foreign_keys = ON");

      const db = wrapConnection(conn);

      databases.set(options.name, { db, conn });

      void runMigrations(db, options.migrations);

      return db;
    },

    async closeDatabase(name: string): Promise<void> {
      const entry = databases.get(name);
      if (!entry) return;
      entry.conn.close();
      databases.delete(name);
    },

    async deleteDatabase(name: string): Promise<void> {
      const entry = databases.get(name);
      if (entry) {
        entry.conn.delete();
        databases.delete(name);
      }
    },
  };
}
