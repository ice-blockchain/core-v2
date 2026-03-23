import { describe, it, expect, beforeEach } from "vitest";
import type { Database, Transaction } from "@ion/storage";
import { createEventRepository, type EventRepository } from "./event-repository";
import type { NostrEvent } from "./types";

function makeEvent(overrides: Partial<NostrEvent> = {}): NostrEvent {
  const id = overrides.id ?? Math.random().toString(36).slice(2);
  return {
    id,
    pubkey: "pk1",
    created_at: 1000,
    kind: 1,
    content: "hello",
    sig: "sig1",
    tags: [],
    ...overrides,
  };
}

function createTestDatabase(): Database {
  const rows: Record<string, unknown>[] = [];

  type Condition =
    | { type: "eq"; col: string; val: unknown }
    | { type: "in"; col: string; vals: unknown[] }
    | { type: "gte"; col: string; val: unknown }
    | { type: "lte"; col: string; val: unknown };

  function matchesWhere(
    row: Record<string, unknown>,
    conditions: Condition[],
  ): boolean {
    return conditions.every((c) => {
      if (c.type === "eq") return row[c.col] === c.val;
      if (c.type === "in") return c.vals.includes(row[c.col]);
      if (c.type === "gte") return (row[c.col] as number) >= (c.val as number);
      if (c.type === "lte") return (row[c.col] as number) <= (c.val as number);
      return true;
    });
  }

  function parseSimpleWhere(
    sql: string,
    params: unknown[],
  ): Condition[] {
    const conditions: Condition[] = [];
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/is);
    if (!whereMatch) return conditions;

    let paramIdx = 0;
    const parts = whereMatch[1]!.split(/\s+AND\s+/i);
    for (const part of parts) {
      const eqMatch = part.match(/(?:\w+\.)?(\w+)\s*=\s*\?/);
      if (eqMatch && paramIdx < params.length) {
        conditions.push({ type: "eq", col: eqMatch[1]!, val: params[paramIdx++] });
        continue;
      }
      const inMatch = part.match(
        /(?:\w+\.)?(\w+)\s+IN\s*\(([^)]+)\)/i,
      );
      if (inMatch) {
        const count = inMatch[2]!.split(",").length;
        const vals = params.slice(paramIdx, paramIdx + count);
        paramIdx += count;
        conditions.push({ type: "in", col: inMatch[1]!, vals });
        continue;
      }
      const gteMatch = part.match(/(?:\w+\.)?(\w+)\s*>=\s*\?/);
      if (gteMatch && paramIdx < params.length) {
        conditions.push({ type: "gte", col: gteMatch[1]!, val: params[paramIdx++] });
        continue;
      }
      const lteMatch = part.match(/(?:\w+\.)?(\w+)\s*<=\s*\?/);
      if (lteMatch && paramIdx < params.length) {
        conditions.push({ type: "lte", col: lteMatch[1]!, val: params[paramIdx++] });
      }
    }
    return conditions;
  }

  const db: Database = {
    async execute(sql: string, params?: unknown[]) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith("CREATE") || trimmed.startsWith("BEGIN") ||
          trimmed === "COMMIT" || trimmed === "ROLLBACK") return;

      const insertMatch = sql.match(
        /INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)\s*\(([^)]+)\)\s*(?:VALUES\s*\(|SELECT\s+)/i,
      );
      if (insertMatch) {
        const cols = insertMatch[2]!.split(",").map((c) => c.trim());
        const row: Record<string, unknown> = {};
        for (let i = 0; i < cols.length; i++) {
          row[cols[i]!] = params?.[i] ?? null;
        }
        const existingIdx = rows.findIndex((r) => r["id"] === row["id"]);
        if (existingIdx >= 0) {
          rows[existingIdx] = row;
        } else {
          rows.push(row);
        }
        return;
      }

      if (trimmed.startsWith("DELETE")) {
        if (!params || params.length === 0) {
          rows.length = 0;
          return;
        }
        const conditions = parseSimpleWhere(sql, params);
        for (let i = rows.length - 1; i >= 0; i--) {
          if (matchesWhere(rows[i]!, conditions)) {
            rows.splice(i, 1);
          }
        }
      }
    },

    async query<T>(sql: string, params?: unknown[]) {
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.includes("FROM __MIGRATIONS")) return [] as T[];
      if (trimmed.includes("DISTINCT KIND")) {
        const kinds = [...new Set(rows.map((r) => r["kind"]))];
        return kinds.map((k) => ({ kind: k })) as T[];
      }

      let result = [...rows];

      if (params && params.length > 0) {
        const conditions = parseSimpleWhere(sql, params);
        if (conditions.length > 0) {
          result = result.filter((r) => matchesWhere(r, conditions));
        }
      }

      if (trimmed.includes("ORDER BY") && trimmed.includes("DESC")) {
        result.sort(
          (a, b) =>
            (b["created_at"] as number) - (a["created_at"] as number),
        );
      }

      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        result = result.slice(0, Number(limitMatch[1]));
      }

      return result as T[];
    },

    async executeBatch(statements) {
      for (const stmt of statements) {
        await db.execute(stmt.sql, stmt.params);
      }
    },

    async transaction<T>(fn: (tx: Transaction) => Promise<T>) {
      const tx: Transaction = {
        execute: db.execute.bind(db),
        query: db.query.bind(db),
      };
      return fn(tx);
    },
  };

  return db;
}

describe("EventRepository", () => {
  let db: Database;
  let repo: EventRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repo = createEventRepository(db);
  });

  it("saves and retrieves events", async () => {
    const event = makeEvent({ id: "e1", content: "test" });
    const saved = await repo.saveEvents([event]);
    expect(saved).toBe(1);

    const results = await repo.queryByFilter({ kinds: [1] });
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("e1");
    expect(results[0]!.content).toBe("test");
  });

  it("saves all event kinds including ephemeral range", async () => {
    const event = makeEvent({ id: "eph1", kind: 20001 });
    const saved = await repo.saveEvents([event]);
    expect(saved).toBe(1);
  });

  it("saves multiple events in batch", async () => {
    const events = [
      makeEvent({ id: "e1", created_at: 100 }),
      makeEvent({ id: "e2", created_at: 200 }),
      makeEvent({ id: "e3", created_at: 300 }),
    ];
    const saved = await repo.saveEvents(events);
    expect(saved).toBe(3);
  });

  it("retrieves replaceable event (latest by pubkey+kind)", async () => {
    await repo.saveEvents([
      makeEvent({ id: "e1", kind: 0, created_at: 100, pubkey: "pk1" }),
      makeEvent({ id: "e2", kind: 0, created_at: 200, pubkey: "pk1" }),
    ]);

    const result = await repo.getReplaceable("pk1", 0);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("e2");
  });

  it("filters by authors", async () => {
    await repo.saveEvents([
      makeEvent({ id: "e1", pubkey: "alice" }),
      makeEvent({ id: "e2", pubkey: "bob" }),
    ]);

    const results = await repo.queryByFilter({ authors: ["alice"] });
    expect(results).toHaveLength(1);
    expect(results[0]!.pubkey).toBe("alice");
  });

  it("preserves tags through save/query cycle", async () => {
    const event = makeEvent({
      id: "e1",
      tags: [["p", "pk2"], ["e", "eid1"]],
    });
    await repo.saveEvents([event]);

    const results = await repo.queryByFilter({ kinds: [1] });
    expect(results[0]!.tags).toEqual([["p", "pk2"], ["e", "eid1"]]);
  });
});
