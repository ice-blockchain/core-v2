import type { Database } from "@ion/storage";
import { buildFilterQuery } from "./build-filter-query";
import { buildSearchText } from "./build-search-text";
import type {
  NostrEvent,
  NostrFilter,
  PruneOptions,
  StoredEvent,
} from "./types";

function toNostrEvent(row: StoredEvent): NostrEvent {
  return {
    id: row.id,
    pubkey: row.pubkey,
    created_at: row.created_at,
    kind: row.kind,
    content: row.content,
    sig: row.sig,
    tags: JSON.parse(row.tags) as string[][],
  };
}

function isReplaceable(kind: number): boolean {
  return kind === 0 || kind === 3 || (kind >= 10000 && kind <= 19999);
}

function isParameterizedReplaceable(kind: number): boolean {
  return kind >= 30000 && kind <= 39999;
}

export interface EventRepository {
  saveEvents(events: NostrEvent[]): Promise<number>;
  queryByFilter(filter: NostrFilter): Promise<NostrEvent[]>;
  getReplaceable(pubkey: string, kind: number): Promise<NostrEvent | null>;
  searchEvents(query: string, limit?: number): Promise<NostrEvent[]>;
  pruneOldEvents(options: PruneOptions): Promise<number>;
}

export function createEventRepository(db: Database): EventRepository {
  return {
    saveEvents: (events) => saveEvents(db, events),
    queryByFilter: (filter) => queryByFilter(db, filter),
    getReplaceable: (pubkey, kind) => getReplaceable(db, pubkey, kind),
    searchEvents: (query, limit) => searchEvents(db, query, limit),
    pruneOldEvents: (options) => pruneOldEvents(db, options),
  };
}

async function saveEvents(db: Database, events: NostrEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  let saved = 0;
  const statements = buildInsertStatements(events);
  await db.transaction(async (tx) => {
    for (const stmt of statements) {
      await tx.execute(stmt.sql, stmt.params);
      saved++;
    }
  });
  return saved;
}

async function queryByFilter(
  db: Database,
  filter: NostrFilter,
): Promise<NostrEvent[]> {
  const { sql, params } = buildFilterQuery(filter);
  const rows = await db.query<StoredEvent>(sql, params);
  return rows.map(toNostrEvent);
}

async function getReplaceable(
  db: Database,
  pubkey: string,
  kind: number,
): Promise<NostrEvent | null> {
  const rows = await db.query<StoredEvent>(
    `SELECT * FROM events
     WHERE pubkey = ? AND kind = ?
     ORDER BY created_at DESC LIMIT 1`,
    [pubkey, kind],
  );
  return rows.length > 0 ? toNostrEvent(rows[0]!) : null;
}

async function searchEvents(
  db: Database,
  query: string,
  limit: number = 50,
): Promise<NostrEvent[]> {
  const rows = await db.query<StoredEvent>(
    `SELECT e.* FROM events e
     JOIN events_fts fts ON e.rowid = fts.rowid
     WHERE events_fts MATCH ?
     ORDER BY e.created_at DESC
     LIMIT ?`,
    [query, limit],
  );
  return rows.map(toNostrEvent);
}

async function pruneOldEvents(
  db: Database,
  options: PruneOptions,
): Promise<number> {
  let total = 0;

  if (options.maxAgeMs !== undefined) {
    await pruneByAge(db, options.maxAgeMs, options.excludeKinds);
  }

  if (options.maxEventsPerKind !== undefined) {
    total += await pruneByKindLimit(db, options);
  }

  return total;
}

async function pruneByAge(
  db: Database,
  maxAgeMs: number,
  excludeKinds?: number[],
): Promise<void> {
  const cutoff = Math.floor((Date.now() - maxAgeMs) / 1000);
  const excludeClause = buildExcludeClause(excludeKinds);
  await db.execute(
    `DELETE FROM events WHERE created_at < ?${excludeClause}`,
    [cutoff, ...(excludeKinds ?? [])],
  );
}

async function pruneByKindLimit(
  db: Database,
  options: PruneOptions,
): Promise<number> {
  let total = 0;
  const kinds = await db.query<{ kind: number }>(
    "SELECT DISTINCT kind FROM events",
  );
  for (const { kind } of kinds) {
    if (options.excludeKinds?.includes(kind)) continue;
    total += await pruneKind(db, kind, options.maxEventsPerKind!);
  }
  return total;
}

function buildInsertStatements(
  events: NostrEvent[],
): Array<{ sql: string; params: unknown[] }> {
  return events.map((event) => buildSingleInsert(event));
}

interface PreparedEvent {
  event: NostrEvent;
  tagsJson: string;
  rawJson: string;
  searchText: string | null;
}

function buildSingleInsert(
  event: NostrEvent,
): { sql: string; params: unknown[] } {
  const prepared: PreparedEvent = {
    event,
    tagsJson: JSON.stringify(event.tags),
    rawJson: JSON.stringify(event),
    searchText: buildSearchText(event),
  };

  if (isReplaceable(event.kind)) return buildReplaceableInsert(prepared);
  if (isParameterizedReplaceable(event.kind)) {
    return buildParameterizedInsert(prepared);
  }
  return buildRegularInsert(prepared);
}

function baseParams(p: PreparedEvent): unknown[] {
  return [
    p.event.id, p.event.pubkey, p.event.created_at, p.event.kind,
    p.event.content, p.event.sig, p.tagsJson, p.rawJson, p.searchText,
  ];
}

function buildReplaceableInsert(
  p: PreparedEvent,
): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT OR REPLACE INTO events
          (id, pubkey, created_at, kind, content, sig, tags, raw_json, search_text)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM events
            WHERE pubkey = ? AND kind = ? AND created_at > ?
          )`,
    params: [
      ...baseParams(p),
      p.event.pubkey, p.event.kind, p.event.created_at,
    ],
  };
}

function buildParameterizedInsert(
  p: PreparedEvent,
): { sql: string; params: unknown[] } {
  const dTag = p.event.tags.find((t) => t[0] === "d")?.[1] ?? "";
  return {
    sql: `INSERT OR REPLACE INTO events
          (id, pubkey, created_at, kind, content, sig, tags, raw_json, search_text)
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM events e
            JOIN event_tags_index t ON e.id = t.event_id
            WHERE e.pubkey = ? AND e.kind = ?
              AND t.tag_name = 'd' AND t.tag_value = ?
              AND e.created_at > ?
          )`,
    params: [
      ...baseParams(p),
      p.event.pubkey, p.event.kind, dTag, p.event.created_at,
    ],
  };
}

function buildRegularInsert(
  p: PreparedEvent,
): { sql: string; params: unknown[] } {
  return {
    sql: `INSERT OR IGNORE INTO events
          (id, pubkey, created_at, kind, content, sig, tags, raw_json, search_text)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: baseParams(p),
  };
}

function buildExcludeClause(
  excludeKinds: number[] | undefined,
): string {
  if (!excludeKinds || excludeKinds.length === 0) return "";
  const placeholders = excludeKinds.map(() => "?").join(", ");
  return ` AND kind NOT IN (${placeholders})`;
}

async function pruneKind(
  db: Database,
  kind: number,
  maxEvents: number,
): Promise<number> {
  const rows = await db.query<{ id: string }>(
    `SELECT id FROM events
     WHERE kind = ?
     ORDER BY created_at DESC
     LIMIT -1 OFFSET ?`,
    [kind, maxEvents],
  );
  if (rows.length === 0) return 0;

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(", ");
  await db.execute(
    `DELETE FROM events WHERE id IN (${placeholders})`,
    ids,
  );
  return ids.length;
}
