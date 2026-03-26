import * as lancedb from '@lancedb/lancedb';
import type {
  PulseLens,
  PulseLensConfig,
  PulseSearchQuery,
  PulseSearchResult,
  PulseVectorEntry,
} from './types.js';

interface LanceRow {
  soul: string;
  vector: number[];
  [key: string]: unknown;
}

interface LanceSearchRow extends LanceRow {
  _distance?: number;
}

export async function createPulseLens(config: PulseLensConfig): Promise<PulseLens> {
  const db = await lancedb.connect(config.path);
  const tableName = config.tableName ?? 'pulse_vectors';
  let table: Awaited<ReturnType<typeof db.openTable>> | null = null;

  return {
    indexVector: async (entry) => {
      table = await ensureTable(db, tableName, table);
      await upsertRow(table, entry);
    },

    indexVectors: async (entries) => {
      table = await ensureTable(db, tableName, table);
      const rows = entries.map(entryToRow);
      await table.add(rows);
    },

    search: async (query) => {
      if (!table) {
        table = await tryOpenTable(db, tableName);
      }
      if (!table) {
        return [];
      }
      return executeSearch(table, query);
    },

    deleteVector: async (soul) => {
      if (!table) {
        table = await tryOpenTable(db, tableName);
      }
      if (!table) {
        return false;
      }
      return deleteFromTable(table, soul);
    },

    getVectorCount: async () => {
      if (!table) {
        table = await tryOpenTable(db, tableName);
      }
      if (!table) {
        return 0;
      }
      return table.countRows();
    },

    close: async () => {
      table = null;
      db.close();
    },
  };
}

async function ensureTable(
  db: Awaited<ReturnType<typeof lancedb.connect>>,
  tableName: string,
  existing: Awaited<ReturnType<typeof db.openTable>> | null
) {
  if (existing) {
    return existing;
  }
  return tryOpenTable(db, tableName) ?? db.createEmptyTable(tableName, []);
}

async function tryOpenTable(
  db: Awaited<ReturnType<typeof lancedb.connect>>,
  tableName: string
) {
  try {
    return await db.openTable(tableName);
  } catch {
    return null;
  }
}

function entryToRow(entry: PulseVectorEntry): LanceRow {
  return { soul: entry.soul, vector: entry.vector, ...entry.metadata };
}

async function upsertRow(
  table: Awaited<ReturnType<typeof lancedb.connect extends (...args: never[]) => Promise<infer R> ? R : never>['openTable']>,
  entry: PulseVectorEntry
): Promise<void> {
  const row = entryToRow(entry);
  await table.add([row]);
}

async function executeSearch(
  table: Awaited<ReturnType<typeof lancedb.connect extends (...args: never[]) => Promise<infer R> ? R : never>['openTable']>,
  query: PulseSearchQuery
): Promise<PulseSearchResult[]> {
  const limit = query.limit ?? 10;
  const results = await table.search(query.vector).limit(limit).toArray();
  return results.map(mapSearchResult);
}

function mapSearchResult(row: LanceSearchRow): PulseSearchResult {
  const { soul, vector: _vector, _distance, ...metadata } = row;
  const score = _distance != null ? 1 - _distance : 0;
  return { soul: soul as string, score, metadata };
}

async function deleteFromTable(
  table: Awaited<ReturnType<typeof lancedb.connect extends (...args: never[]) => Promise<infer R> ? R : never>['openTable']>,
  soul: string
): Promise<boolean> {
  try {
    await table.delete(`soul = "${soul}"`);
    return true;
  } catch {
    return false;
  }
}
