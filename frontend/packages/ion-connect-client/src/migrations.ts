import type { Migration } from "@ion/storage";

export const nostrMigrations: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        pubkey TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        kind INTEGER NOT NULL,
        content TEXT NOT NULL,
        sig TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        raw_json TEXT NOT NULL,
        search_text TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_events_kind_created
        ON events(kind, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_events_pubkey_kind_created
        ON events(pubkey, kind, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_events_created
        ON events(created_at DESC);
    `,
  },
  {
    version: 2,
    up: `
      CREATE TABLE IF NOT EXISTS event_tags_index (
        event_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        tag_value TEXT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tag_lookup
        ON event_tags_index(tag_name, tag_value, event_id);

      CREATE INDEX IF NOT EXISTS idx_tag_event
        ON event_tags_index(event_id);

      CREATE TRIGGER IF NOT EXISTS events_tags_index_insert
        AFTER INSERT ON events
      BEGIN
        INSERT INTO event_tags_index (event_id, tag_name, tag_value)
        SELECT new.id, json_extract(value, '$[0]'), json_extract(value, '$[1]')
        FROM json_each(new.tags)
        WHERE json_extract(value, '$[1]') IS NOT NULL;
      END;

      CREATE TRIGGER IF NOT EXISTS events_tags_index_delete
        BEFORE DELETE ON events
      BEGIN
        DELETE FROM event_tags_index WHERE event_id = old.id;
      END;
    `,
  },
  {
    version: 3,
    up: `
      CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
        search_text,
        content='events',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS events_fts_insert
        AFTER INSERT ON events
      BEGIN
        INSERT INTO events_fts(rowid, search_text)
        VALUES (new.rowid, new.search_text);
      END;

      CREATE TRIGGER IF NOT EXISTS events_fts_delete
        BEFORE DELETE ON events
      BEGIN
        INSERT INTO events_fts(events_fts, rowid, search_text)
        VALUES ('delete', old.rowid, old.search_text);
      END;

      CREATE TRIGGER IF NOT EXISTS events_fts_update
        AFTER UPDATE ON events
      BEGIN
        INSERT INTO events_fts(events_fts, rowid, search_text)
        VALUES ('delete', old.rowid, old.search_text);
        INSERT INTO events_fts(rowid, search_text)
        VALUES (new.rowid, new.search_text);
      END;
    `,
  },
];
