import * as lancedb from '@lancedb/lancedb';
import type { Table as LanceTable } from '@lancedb/lancedb';
import type {
  PulseLensConfig,
  PulseLensInstance,
  PulseSearchQuery,
  PulseSearchResult,
  PulseVectorEntry,
} from './types';

const TABLE_NAME = 'pulse_vectors';

interface LanceVectorRow {
  readonly soul: string;
  readonly vector: number[];
  readonly userId: string;
  readonly timestamp: number;
  readonly labels: string;
  readonly contentType: string;
}

function entryToRow(entry: PulseVectorEntry): LanceVectorRow {
  return {
    soul: entry.soul,
    vector: entry.embedding,
    userId: entry.metadata.userId ?? '',
    timestamp: entry.metadata.timestamp ?? 0,
    labels: JSON.stringify(entry.metadata.labels ?? []),
    contentType: entry.metadata.contentType ?? '',
  };
}

function rowToSearchResult(
  row: Record<string, unknown>,
  distance: number,
): PulseSearchResult {
  const score = 1 / (1 + distance);
  const labelsRaw = row['labels'] as string;

  return {
    soul: row['soul'] as string,
    score,
    metadata: {
      soul: row['soul'] as string,
      userId: (row['userId'] as string) || undefined,
      timestamp: (row['timestamp'] as number) || undefined,
      labels: labelsRaw ? JSON.parse(labelsRaw) : undefined,
      contentType: (row['contentType'] as string) || undefined,
    },
  };
}

async function getOrCreateTable(
  connection: lancedb.Connection,
  seedEntry: PulseVectorEntry,
): Promise<LanceTable> {
  const names = await connection.tableNames();
  if (names.includes(TABLE_NAME)) {
    return connection.openTable(TABLE_NAME);
  }
  return connection.createTable(
    TABLE_NAME,
    [entryToRow(seedEntry)],
  );
}

async function ensureTable(
  state: LanceDbState,
  seedEntry?: PulseVectorEntry,
): Promise<LanceTable | null> {
  if (state.table) return state.table;

  if (!seedEntry) {
    const names = await state.connection.tableNames();
    if (!names.includes(TABLE_NAME)) return null;
    state.table = await state.connection.openTable(TABLE_NAME);
    return state.table;
  }

  state.table = await getOrCreateTable(
    state.connection,
    seedEntry,
  );
  return state.table;
}

interface LanceDbState {
  readonly connection: lancedb.Connection;
  table: LanceTable | null;
}

async function indexVector(
  state: LanceDbState,
  entry: PulseVectorEntry,
): Promise<void> {
  const table = await ensureTable(state, entry);
  if (!table) return;

  const row = entryToRow(entry);
  await table
    .mergeInsert('soul')
    .whenMatchedUpdateAll()
    .whenNotMatchedInsertAll()
    .execute([row]);
}

async function searchVectors(
  state: LanceDbState,
  query: PulseSearchQuery,
): Promise<PulseSearchResult[]> {
  const table = await ensureTable(state);
  if (!table) return [];

  const limit = query.limit ?? 10;
  let vectorQuery = table.search(query.embedding).limit(limit);

  if (query.filter) {
    vectorQuery = vectorQuery.where(query.filter);
  }

  const rows = await vectorQuery.toArray();
  return rows.map((row) =>
    rowToSearchResult(
      row as Record<string, unknown>,
      (row as Record<string, unknown>)['_distance'] as number,
    ),
  );
}

async function deleteVector(
  state: LanceDbState,
  soul: string,
): Promise<boolean> {
  const table = await ensureTable(state);
  if (!table) return false;

  const countBefore = await table.countRows();
  await table.delete(`soul = '${soul}'`);
  const countAfter = await table.countRows();
  return countAfter < countBefore;
}

async function getVectorCount(
  state: LanceDbState,
): Promise<number> {
  const table = await ensureTable(state);
  if (!table) return 0;
  return table.countRows();
}

export function createLanceDbLens(
  config: PulseLensConfig,
): PulseLensInstance {
  const connectionPromise = lancedb.connect(config.storagePath);
  const state: LanceDbState = {
    connection: null as unknown as lancedb.Connection,
    table: null,
  };

  const initialize = async (): Promise<void> => {
    state.connection = await connectionPromise;
  };

  const initPromise = initialize();

  const waitForInit = async (): Promise<void> => {
    await initPromise;
  };

  return {
    indexVector: async (entry: PulseVectorEntry): Promise<void> => {
      await waitForInit();
      return indexVector(state, entry);
    },
    search: async (
      query: PulseSearchQuery,
    ): Promise<PulseSearchResult[]> => {
      await waitForInit();
      return searchVectors(state, query);
    },
    deleteVector: async (soul: string): Promise<boolean> => {
      await waitForInit();
      return deleteVector(state, soul);
    },
    getVectorCount: async (): Promise<number> => {
      await waitForInit();
      return getVectorCount(state);
    },
  };
}
