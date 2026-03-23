import type {
  Database,
  DatabaseOptions,
  IDatabaseStorage,
  Transaction,
} from "../types";
import { runMigrations } from "./run-migrations";

interface WebDatabase {
  db: Database;
  dbId: number;
  api: import("@journeyapps/wa-sqlite").SQLiteAPI;
}

function executeSQL(
  api: import("@journeyapps/wa-sqlite").SQLiteAPI,
  dbId: number,
  sql: string,
  params?: unknown[],
): Record<string, unknown>[] {
  const stmt = api.prepare_v2(dbId, sql);
  if (!stmt) return [];

  if (params) {
    for (let i = 0; i < params.length; i++) {
      api.bind(stmt, i + 1, params[i]);
    }
  }

  const rows: Record<string, unknown>[] = [];
  const SQLITE_ROW = 100;

  while (api.step(stmt) === SQLITE_ROW) {
    const colCount = api.column_count(stmt);
    const row: Record<string, unknown> = {};
    for (let i = 0; i < colCount; i++) {
      row[api.column_name(stmt, i)] = api.column(stmt, i);
    }
    rows.push(row);
  }

  api.finalize(stmt);
  return rows;
}

function wrapWebDatabase(
  api: import("@journeyapps/wa-sqlite").SQLiteAPI,
  dbId: number,
): Database {
  const db: Database = {
    async execute(sql: string, params?: unknown[]): Promise<void> {
      executeSQL(api, dbId, sql, params);
    },

    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      return executeSQL(api, dbId, sql, params) as T[];
    },

    async executeBatch(
      statements: Array<{ sql: string; params?: unknown[] }>,
    ): Promise<void> {
      executeSQL(api, dbId, "BEGIN TRANSACTION");
      try {
        for (const stmt of statements) {
          executeSQL(api, dbId, stmt.sql, stmt.params);
        }
        executeSQL(api, dbId, "COMMIT");
      } catch (error) {
        executeSQL(api, dbId, "ROLLBACK");
        throw error;
      }
    },

    async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
      executeSQL(api, dbId, "BEGIN TRANSACTION");
      try {
        const tx: Transaction = {
          async execute(sql: string, params?: unknown[]) {
            executeSQL(api, dbId, sql, params);
          },
          async query<R>(sql: string, params?: unknown[]) {
            return executeSQL(api, dbId, sql, params) as R[];
          },
        };
        const result = await fn(tx);
        executeSQL(api, dbId, "COMMIT");
        return result;
      } catch (error) {
        executeSQL(api, dbId, "ROLLBACK");
        throw error;
      }
    },
  };

  return db;
}

export function createDatabaseStorage(): IDatabaseStorage {
  const databases = new Map<string, WebDatabase>();
  let modulePromise: Promise<
    import("@journeyapps/wa-sqlite").SQLiteAPI
  > | null = null;

  async function getModule(): Promise<
    import("@journeyapps/wa-sqlite").SQLiteAPI
  > {
    if (!modulePromise) {
      modulePromise = (async () => {
        const SQLiteAsyncESMFactory = (
          await import("@journeyapps/wa-sqlite")
        ).default;
        return SQLiteAsyncESMFactory.default();
      })();
    }
    return modulePromise;
  }

  return {
    getDatabase(options: DatabaseOptions): Database {
      const existing = databases.get(options.name);
      if (existing) return existing.db;

      let resolveReady: () => void;
      const readyPromise = new Promise<void>((resolve) => {
        resolveReady = resolve;
      });

      const pendingDb: Database = {
        async execute(sql, params) {
          await readyPromise;
          const entry = databases.get(options.name);
          if (entry) await entry.db.execute(sql, params);
        },
        async query(sql, params) {
          await readyPromise;
          const entry = databases.get(options.name);
          if (!entry) return [];
          return entry.db.query(sql, params);
        },
        async executeBatch(statements) {
          await readyPromise;
          const entry = databases.get(options.name);
          if (entry) await entry.db.executeBatch(statements);
        },
        async transaction(fn) {
          await readyPromise;
          const entry = databases.get(options.name);
          if (!entry) throw new Error(`Database ${options.name} not ready`);
          return entry.db.transaction(fn);
        },
      };

      databases.set(options.name, {
        db: pendingDb,
        dbId: -1,
        api: null as unknown as import("@journeyapps/wa-sqlite").SQLiteAPI,
      });

      void (async () => {
        const api = await getModule();
        const OPEN_FLAGS = 0x00000002 | 0x00000004;
        const dbId = api.open_v2(
          `${options.name}.db`,
          OPEN_FLAGS,
        );

        api.exec(dbId, "PRAGMA journal_mode = WAL");
        api.exec(dbId, "PRAGMA foreign_keys = ON");

        const realDb = wrapWebDatabase(api, dbId);
        databases.set(options.name, { db: realDb, dbId, api });

        await runMigrations(realDb, options.migrations);
        resolveReady!();
      })();

      return pendingDb;
    },

    async closeDatabase(name: string): Promise<void> {
      const entry = databases.get(name);
      if (!entry || entry.dbId === -1) return;
      entry.api.close(entry.dbId);
      databases.delete(name);
    },

    async deleteDatabase(name: string): Promise<void> {
      await this.closeDatabase(name);
    },
  };
}
