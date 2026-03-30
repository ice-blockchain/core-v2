import type { Migration } from "@ion/storage";

export const uploadQueueMigrations: Migration[] = [
  {
    version: 1,
    up: `CREATE TABLE IF NOT EXISTS upload_queue (
      upload_id TEXT PRIMARY KEY,
      uri TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      bucket_name TEXT,
      object_name TEXT,
      bytes_uploaded INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  },
];
