import type {
  DuckDBConnection,
  DuckDBPreparedStatement,
} from '@duckdb/node-api';
import { DuckDBInstance } from '@duckdb/node-api';
import type {
  PulseAggregateInstance,
  PulseAnalyticsEvent,
  PulseCountQuery,
  PulseCountResult,
  PulseEventFilter,
  PulseTimeSeriesQuery,
  PulseTimeSeriesResult,
} from './types';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS pulse_events (
    soul VARCHAR NOT NULL,
    event_type VARCHAR NOT NULL,
    ts BIGINT NOT NULL,
    user_id VARCHAR NOT NULL,
    target_id VARCHAR,
    value DOUBLE,
    labels VARCHAR
  )
`;

const INSERT_SQL =
  'INSERT INTO pulse_events VALUES (?, ?, ?, ?, ?, ?, ?)';

function buildWhereClause(filter?: PulseEventFilter): string {
  if (!filter) return '';
  const conditions: string[] = [];
  if (filter.eventType) conditions.push('event_type = ?');
  if (filter.userId) conditions.push('user_id = ?');
  if (filter.fromTimestamp) conditions.push('ts >= ?');
  if (filter.toTimestamp) conditions.push('ts <= ?');
  if (conditions.length === 0) return '';
  return ` WHERE ${conditions.join(' AND ')}`;
}

const GROUP_COLUMN_MAP: Record<string, string> = {
  eventType: 'event_type',
  userId: 'user_id',
  targetId: 'target_id',
  soul: 'soul',
};

function resolveColumnName(groupBy: string): string {
  return GROUP_COLUMN_MAP[groupBy] ?? groupBy;
}

function bindFilterValues(
  stmt: DuckDBPreparedStatement,
  filter: PulseEventFilter | undefined,
  startIndex: number,
): void {
  if (!filter) return;
  let index = startIndex;
  if (filter.eventType) {
    stmt.bindVarchar(index++, filter.eventType);
  }
  if (filter.userId) {
    stmt.bindVarchar(index++, filter.userId);
  }
  if (filter.fromTimestamp) {
    stmt.bindBigInt(index++, BigInt(filter.fromTimestamp));
  }
  if (filter.toTimestamp) {
    stmt.bindBigInt(index++, BigInt(filter.toTimestamp));
  }
}

function bindOptionalVarchar(
  stmt: DuckDBPreparedStatement,
  index: number,
  value: string | undefined,
): void {
  if (value === undefined || value === null) {
    stmt.bindNull(index);
  } else {
    stmt.bindVarchar(index, value);
  }
}

function bindOptionalDouble(
  stmt: DuckDBPreparedStatement,
  index: number,
  value: number | undefined,
): void {
  if (value === undefined || value === null) {
    stmt.bindNull(index);
  } else {
    stmt.bindDouble(index, value);
  }
}

async function insertSingleEvent(
  stmt: DuckDBPreparedStatement,
  event: PulseAnalyticsEvent,
): Promise<void> {
  const labels = event.labels?.join(',') ?? undefined;
  stmt.clearBindings();
  stmt.bindVarchar(1, event.soul);
  stmt.bindVarchar(2, event.eventType);
  stmt.bindBigInt(3, BigInt(event.timestamp));
  stmt.bindVarchar(4, event.userId);
  bindOptionalVarchar(stmt, 5, event.targetId);
  bindOptionalDouble(stmt, 6, event.value);
  bindOptionalVarchar(stmt, 7, labels);
  await stmt.run();
}

async function ingestEvents(
  conn: DuckDBConnection,
  events: PulseAnalyticsEvent[],
): Promise<void> {
  const stmt = await conn.prepare(INSERT_SQL);
  for (const event of events) {
    await insertSingleEvent(stmt, event);
  }
  stmt.destroySync();
}

interface DuckDbReadResult {
  getRowObjectsJson(): Array<Record<string, unknown>>;
}

function parseCountResults(
  result: DuckDbReadResult,
): PulseCountResult[] {
  const rows = result.getRowObjectsJson();
  return rows.map((row) => ({
    group: String(row['grp']),
    count: Number(row['cnt']),
  }));
}

function parseTimeSeriesResults(
  result: DuckDbReadResult,
): PulseTimeSeriesResult[] {
  const rows = result.getRowObjectsJson();
  return rows.map((row) => ({
    bucket: Number(row['bucket']),
    count: Number(row['cnt']),
  }));
}

async function countGrouped(
  conn: DuckDBConnection,
  query: PulseCountQuery,
): Promise<PulseCountResult[]> {
  const column = resolveColumnName(query.groupBy);
  const where = buildWhereClause(query.filter);
  const sql = `SELECT ${column} as grp, COUNT(*) as cnt
    FROM pulse_events${where} GROUP BY ${column}`;
  const stmt = await conn.prepare(sql);
  bindFilterValues(stmt, query.filter, 1);
  const result = await stmt.runAndReadAll();
  stmt.destroySync();
  return parseCountResults(result);
}

async function queryTimeSeries(
  conn: DuckDBConnection,
  query: PulseTimeSeriesQuery,
): Promise<PulseTimeSeriesResult[]> {
  const where = buildWhereClause(query.filter);
  const sql = `SELECT (CAST(FLOOR(ts / ?) AS BIGINT) * ?)
    as bucket, COUNT(*) as cnt FROM pulse_events${where}
    GROUP BY bucket ORDER BY bucket`;
  const stmt = await conn.prepare(sql);
  stmt.bindInteger(1, query.bucketSizeMs);
  stmt.bindInteger(2, query.bucketSizeMs);
  bindFilterValues(stmt, query.filter, 3);
  const result = await stmt.runAndReadAll();
  stmt.destroySync();
  return parseTimeSeriesResults(result);
}

async function getEventCount(
  conn: DuckDBConnection,
): Promise<number> {
  const result = await conn.runAndReadAll(
    'SELECT COUNT(*) as cnt FROM pulse_events',
  );
  const rows = result.getRowObjectsJson();
  return Number(rows[0]?.['cnt'] ?? 0);
}

async function clearEvents(
  conn: DuckDBConnection,
): Promise<void> {
  await conn.run('DELETE FROM pulse_events');
}

export async function createDuckDbAggregate(): Promise<PulseAggregateInstance> {
  const instance = await DuckDBInstance.create(':memory:');
  const conn = await instance.connect();
  await conn.run(CREATE_TABLE_SQL);

  return {
    ingestEvents: (events) => ingestEvents(conn, events),
    count: (query) => countGrouped(conn, query),
    timeSeries: (query) => queryTimeSeries(conn, query),
    getEventCount: () => getEventCount(conn),
    clear: () => clearEvents(conn),
    close: async () => {
      conn.closeSync();
      instance.closeSync();
    },
  };
}
