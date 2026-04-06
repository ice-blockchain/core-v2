import type { Migration } from '@ion/storage';

export const downloadQueueMigrations: Migration[] = [
  {
    version: 1,
    up: `CREATE TABLE IF NOT EXISTS download_queue (
      download_id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      local_path TEXT,
      cdn_url TEXT,
      ton_bag_id TEXT,
      ton_file_index INTEGER,
      file_size INTEGER NOT NULL DEFAULT 0,
      bytes_downloaded INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  },
  {
    version: 2,
    up: `CREATE TABLE IF NOT EXISTS file_cache (
      file_id TEXT PRIMARY KEY,
      local_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_accessed_at INTEGER NOT NULL
    )`,
  },
];
