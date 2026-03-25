import type { SQLiteAPI } from "@journeyapps/wa-sqlite";
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
  api: SQLiteAPI;
}

interface SqlConnection {
  api: SQLiteAPI;
  dbId: number;
}

function executeSQL(conn: SqlConnection, sql: string, params?: unknown[]): Record<string, unknown>[] {
  const stmt = conn.api.prepare_v2(conn.dbId, sql);
  if (!stmt) return [];

  if (params) {
    for (let i = 0; i < params.length; i++) {
      conn.api.bind(stmt, i + 1, params[i]);
    }
  }

  return collectRows(conn.api, stmt);
}

function collectRows(
  api: SQLiteAPI,
  stmt: number,
): Record<string, unknown>[] {
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

function buildExecuteBatch(conn: SqlConnection): Database["executeBatch"] {
  return async (statements) => {
    executeSQL(conn, "BEGIN TRANSACTION");
    try {
      for (const stmt of statements) {
        executeSQL(conn, stmt.sql, stmt.params);
      }
      executeSQL(conn, "COMMIT");
    } catch (error) {
      executeSQL(conn, "ROLLBACK");
      throw error;
    }
  };
}

function buildTransaction(conn: SqlConnection): Database["transaction"] {
  return async (fn) => {
    executeSQL(conn, "BEGIN TRANSACTION");
    try {
      const tx: Transaction = {
        async execute(sql, params) { executeSQL(conn, sql, params); },
        async query(sql, params) { return executeSQL(conn, sql, params) as never; },
      };
      const result = await fn(tx);
      executeSQL(conn, "COMMIT");
      return result;
    } catch (error) {
      executeSQL(conn, "ROLLBACK");
      throw error;
    }
  };
}

function wrapWebDatabase(conn: SqlConnection): Database {
  return {
    async execute(sql: string, params?: unknown[]): Promise<void> {
      executeSQL(conn, sql, params);
    },
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      return executeSQL(conn, sql, params) as T[];
    },
    executeBatch: buildExecuteBatch(conn),
    transaction: buildTransaction(conn),
  };
}

async function loadSQLiteModule(): Promise<SQLiteAPI> {
  const SQLiteAsyncESMFactory = (
    await import("@journeyapps/wa-sqlite")
  ).default;
  return SQLiteAsyncESMFactory.default();
}

function createPendingDatabase(
  databases: Map<string, WebDatabase>,
  options: DatabaseOptions,
  readyPromise: Promise<void>,
): Database {
  return {
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
}

async function initializeDatabase(
  databases: Map<string, WebDatabase>,
  options: DatabaseOptions,
  getModule: () => Promise<SQLiteAPI>,
): Promise<void> {
  const api = await getModule();
  const OPEN_FLAGS = 0x00000002 | 0x00000004;
  const dbId = api.open_v2(`${options.name}.db`, OPEN_FLAGS);

  api.exec(dbId, "PRAGMA journal_mode = WAL");
  api.exec(dbId, "PRAGMA foreign_keys = ON");

  const realDb = wrapWebDatabase({ api, dbId });
  databases.set(options.name, { db: realDb, dbId, api });
  await runMigrations(realDb, options.migrations);
}

function openDatabase(
  databases: Map<string, WebDatabase>,
  options: DatabaseOptions,
  getModule: () => Promise<SQLiteAPI>,
): Database {
  const existing = databases.get(options.name);
  if (existing) return existing.db;

  let resolveReady: () => void;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const pendingDb = createPendingDatabase(databases, options, readyPromise);
  databases.set(options.name, {
    db: pendingDb,
    dbId: -1,
    api: null as unknown as SQLiteAPI,
  });

  void initializeDatabase(databases, options, getModule).then(() => {
    resolveReady!();
  });

  return pendingDb;
}

export function createDatabaseStorage(): IDatabaseStorage {
  const databases = new Map<string, WebDatabase>();
  let modulePromise: Promise<SQLiteAPI> | null = null;

  function getModule(): Promise<SQLiteAPI> {
    if (!modulePromise) {
      modulePromise = loadSQLiteModule();
    }
    return modulePromise;
  }

  return {
    getDatabase(options: DatabaseOptions): Database {
      return openDatabase(databases, options, getModule);
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
