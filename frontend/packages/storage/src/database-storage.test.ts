import { describe, it, expect, beforeEach } from "vitest";
import type { Database, Migration, Transaction } from "./types";
import { runMigrations } from "./platform/run-migrations";

function createInMemoryDatabase(): Database {
  const tables = new Map<string, Record<string, unknown>[]>();
  let inTransaction = false;

  function parseCreateTable(sql: string): string | null {
    const match = sql.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i,
    );
    return match ? match[1]! : null;
  }

  function getTable(name: string): Record<string, unknown>[] {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name)!;
  }

  function resolveParams(sql: string, params?: unknown[]): {
    resolvedSql: string;
    resolvedParams: unknown[];
  } {
    return { resolvedSql: sql, resolvedParams: params ?? [] };
  }

  function executeInternal(
    sql: string,
    params?: unknown[],
  ): Record<string, unknown>[] {
    const { resolvedSql, resolvedParams } = resolveParams(sql, params);
    const trimmed = resolvedSql.trim().toUpperCase();

    if (
      trimmed.startsWith("BEGIN") ||
      trimmed === "COMMIT" ||
      trimmed === "ROLLBACK"
    ) {
      return [];
    }

    const tableName = parseCreateTable(resolvedSql);
    if (tableName) {
      if (!tables.has(tableName)) tables.set(tableName, []);
      return [];
    }

    if (trimmed.startsWith("CREATE INDEX") || trimmed.startsWith("CREATE TRIGGER") || trimmed.startsWith("CREATE VIRTUAL")) {
      return [];
    }

    const insertMatch = resolvedSql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tbl = insertMatch[1]!;
      const cols = insertMatch[2]!.split(",").map((c) => c.trim());
      const row: Record<string, unknown> = {};
      for (let i = 0; i < cols.length; i++) {
        const val = resolvedParams[i];
        row[cols[i]!] = val !== undefined ? val : null;
      }
      getTable(tbl).push(row);
      return [];
    }

    const selectMatch = resolvedSql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+(?:WHERE|ORDER|LIMIT)(.*))?/is);
    if (selectMatch) {
      const tbl = selectMatch[2]!;
      const rows = getTable(tbl);

      const whereClause = resolvedSql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/is);
      if (whereClause) {
        const conditions = whereClause[1]!.split(/\s+AND\s+/i);
        let filtered = rows;
        let paramIdx = 0;

        for (const cond of conditions) {
          const eqMatch = cond.match(/(\w+)\s*=\s*\?/);
          if (eqMatch) {
            const col = eqMatch[1]!;
            const val = resolvedParams[paramIdx++];
            filtered = filtered.filter((r) => r[col] === val);
          }
        }
        return filtered;
      }

      return [...rows];
    }

    const deleteMatch = resolvedSql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (deleteMatch) {
      const tbl = deleteMatch[1]!;
      const whereClause = resolvedSql.match(/WHERE\s+(.+)/is);
      if (whereClause) {
        const eqMatch = whereClause[1]!.match(/(\w+)\s*=\s*\?/);
        if (eqMatch) {
          const col = eqMatch[1]!;
          const val = resolvedParams[0];
          const tblData = getTable(tbl);
          const filtered = tblData.filter((r) => r[col] !== val);
          tables.set(tbl, filtered);
        }
      } else {
        tables.set(tbl, []);
      }
      return [];
    }

    return [];
  }

  const db: Database = {
    async execute(sql: string, params?: unknown[]) {
      executeInternal(sql, params);
    },

    async query<T>(sql: string, params?: unknown[]) {
      return executeInternal(sql, params) as T[];
    },

    async executeBatch(statements) {
      for (const stmt of statements) {
        executeInternal(stmt.sql, stmt.params);
      }
    },

    async transaction<T>(fn: (tx: Transaction) => Promise<T>) {
      if (inTransaction) throw new Error("Nested transactions not supported");
      inTransaction = true;
      try {
        const tx: Transaction = {
          async execute(sql, params) {
            executeInternal(sql, params);
          },
          async query<R>(sql: string, params?: unknown[]) {
            return executeInternal(sql, params) as R[];
          },
        };
        const result = await fn(tx);
        inTransaction = false;
        return result;
      } catch (error) {
        inTransaction = false;
        throw error;
      }
    },
  };

  return db;
}

describe("runMigrations", () => {
  let db: Database;

  beforeEach(() => {
    db = createInMemoryDatabase();
  });

  it("creates migration tracking table", async () => {
    await runMigrations(db, []);
    const rows = await db.query("SELECT version FROM __migrations");
    expect(rows).toEqual([]);
  });

  it("runs migrations in version order", async () => {
    const migrations: Migration[] = [
      { version: 2, up: "CREATE TABLE IF NOT EXISTS b (id TEXT)" },
      { version: 1, up: "CREATE TABLE IF NOT EXISTS a (id TEXT)" },
    ];

    await runMigrations(db, migrations);

    const applied = await db.query<{ version: number }>(
      "SELECT version FROM __migrations ORDER BY version",
    );
    expect(applied.map((r) => r.version)).toEqual([1, 2]);
  });

  it("skips already-applied migrations", async () => {
    const migrations: Migration[] = [
      { version: 1, up: "CREATE TABLE IF NOT EXISTS a (id TEXT)" },
    ];

    await runMigrations(db, migrations);
    await runMigrations(db, [
      ...migrations,
      { version: 2, up: "CREATE TABLE IF NOT EXISTS b (id TEXT)" },
    ]);

    const applied = await db.query<{ version: number }>(
      "SELECT version FROM __migrations ORDER BY version",
    );
    expect(applied.map((r) => r.version)).toEqual([1, 2]);
  });
});

describe("Database interface contract", () => {
  let db: Database;

  beforeEach(async () => {
    db = createInMemoryDatabase();
    await db.execute(
      "CREATE TABLE IF NOT EXISTS items (id TEXT, name TEXT, value TEXT)",
    );
  });

  it("inserts and queries rows", async () => {
    await db.execute(
      "INSERT INTO items (id, name, value) VALUES (?, ?, ?)",
      ["1", "test", "hello"],
    );

    const rows = await db.query<{ id: string; name: string; value: string }>(
      "SELECT id, name, value FROM items",
    );
    expect(rows).toEqual([{ id: "1", name: "test", value: "hello" }]);
  });

  it("queries with WHERE params", async () => {
    await db.execute(
      "INSERT INTO items (id, name, value) VALUES (?, ?, ?)",
      ["1", "a", "x"],
    );
    await db.execute(
      "INSERT INTO items (id, name, value) VALUES (?, ?, ?)",
      ["2", "b", "y"],
    );

    const rows = await db.query<{ id: string }>(
      "SELECT id FROM items WHERE name = ?",
      ["b"],
    );
    expect(rows).toEqual([{ id: "2", name: "b", value: "y" }]);
  });

  it("executes batch statements", async () => {
    await db.executeBatch([
      { sql: "INSERT INTO items (id, name, value) VALUES (?, ?, ?)", params: ["1", "a", "x"] },
      { sql: "INSERT INTO items (id, name, value) VALUES (?, ?, ?)", params: ["2", "b", "y"] },
    ]);

    const rows = await db.query("SELECT id FROM items");
    expect(rows).toHaveLength(2);
  });

  it("runs transactions", async () => {
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        "INSERT INTO items (id, name, value) VALUES (?, ?, ?)",
        ["1", "tx-item", "v"],
      );
      const rows = await tx.query<{ id: string }>(
        "SELECT id FROM items WHERE name = ?",
        ["tx-item"],
      );
      return rows;
    });

    expect(result).toHaveLength(1);
  });

  it("deletes rows", async () => {
    await db.execute(
      "INSERT INTO items (id, name, value) VALUES (?, ?, ?)",
      ["1", "del", "x"],
    );
    await db.execute("DELETE FROM items WHERE id = ?", ["1"]);

    const rows = await db.query("SELECT id FROM items");
    expect(rows).toHaveLength(0);
  });
});
