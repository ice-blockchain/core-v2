import type { Database } from '@ion/storage';
import type { CacheRecord } from './types';

export function createCacheRepository(database: Database) {
  return {
    insertEntry: (record: CacheRecord) => insertEntry(database, record),
    getEntry: (fileId: string) => getEntry(database, fileId),
    touchEntry: (fileId: string) => touchEntry(database, fileId),
    deleteEntry: (fileId: string) => deleteEntry(database, fileId),
    getTotalSize: () => getTotalSize(database),
    getEvictionCandidates: (limit: number) => getEvictionCandidates(database, limit),
    getAllEntries: () => getAllEntries(database),
  } as const;
}

async function insertEntry(database: Database, record: CacheRecord): Promise<void> {
  await database.execute(
    'INSERT OR REPLACE INTO file_cache (file_id, local_path, file_size, created_at, last_accessed_at) VALUES (?, ?, ?, ?, ?)',
    [record.file_id, record.local_path, record.file_size, record.created_at, record.last_accessed_at],
  );
}

async function getEntry(database: Database, fileId: string): Promise<CacheRecord | null> {
  const rows = await database.query<CacheRecord>('SELECT * FROM file_cache WHERE file_id = ?', [fileId]);
  return rows[0] ?? null;
}

async function touchEntry(database: Database, fileId: string): Promise<void> {
  await database.execute('UPDATE file_cache SET last_accessed_at = ? WHERE file_id = ?', [Date.now(), fileId]);
}

async function deleteEntry(database: Database, fileId: string): Promise<void> {
  await database.execute('DELETE FROM file_cache WHERE file_id = ?', [fileId]);
}

async function getTotalSize(database: Database): Promise<number> {
  const rows = await database.query<{ total: number }>('SELECT COALESCE(SUM(file_size), 0) as total FROM file_cache');
  return rows[0]?.total ?? 0;
}

async function getEvictionCandidates(database: Database, limit: number): Promise<CacheRecord[]> {
  return database.query<CacheRecord>('SELECT * FROM file_cache ORDER BY last_accessed_at ASC LIMIT ?', [limit]);
}

async function getAllEntries(database: Database): Promise<CacheRecord[]> {
  return database.query<CacheRecord>('SELECT * FROM file_cache ORDER BY last_accessed_at DESC');
}
