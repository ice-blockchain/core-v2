# @ion/ion-connect-client Architecture

Nostr event storage and querying client. Manages Nostr protocol events in a local SQLite database with support for replaceable events, tag-based filtering, full-text search, and pruning.

## Public API

```typescript
export { createEventRepository }   // Factory: (db: Database) -> EventRepository
export { nostrMigrations }         // Database schema migrations (3 versions)
export { buildFilterQuery }        // Convert NostrFilter to SQL
export { buildSearchText }         // Extract searchable text from events by kind

export type { NostrEvent, NostrFilter, StoredEvent, PruneOptions, EventRepository }
```

## Data Structures

```typescript
interface NostrEvent {
  id: string;             // Event hash
  pubkey: string;         // Author public key
  created_at: number;     // Unix timestamp
  kind: number;           // Event type
  content: string;        // Payload
  sig: string;            // Cryptographic signature
  tags: string[][];       // Key-value metadata
}

interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  since?: number;
  until?: number;
  limit?: number;
  [key: `#${string}`]: string[];  // Tag filters (#p, #e, etc.)
}

interface EventRepository {
  saveEvents(events: NostrEvent[]): Promise<number>;
  queryByFilter(filter: NostrFilter): Promise<NostrEvent[]>;
  getReplaceable(pubkey: string, kind: number): Promise<NostrEvent | null>;
  searchEvents(query: string, limit?: number): Promise<NostrEvent[]>;
  pruneOldEvents(options: PruneOptions): Promise<number>;
}
```

## Database Schema (3 Migrations)

| Version | What | Why |
|---------|------|-----|
| 1 | `events` table + indexes on kind, pubkey, created_at | Core event storage |
| 2 | `event_tags_index` table + triggers | Denormalized tag lookup for filtering |
| 3 | FTS5 virtual table + triggers | Full-text search on extracted content |

## Nostr Event Kind Semantics

| Kind Range | Behavior | Dedup Key |
|-----------|----------|-----------|
| 0-3, 10000-19999 | Replaceable: only latest per author | pubkey + kind |
| 30000-39999 | Parameterized replaceable | pubkey + kind + d-tag |
| All others | Regular: stored as-is | event id (INSERT OR IGNORE) |

## Search Text Extraction

| Kind | Indexed Content |
|------|----------------|
| 0 (profile) | `display_name`, `name`, `about` from JSON content |
| 1 (note) | Raw content |
| 30023 (article) | `title` tag + content |
| Other | Not indexed (null) |

## Design Decisions

- **Stateless repository**: All state lives in the database. Repository is a pure function interface.
- **Transactional saves**: `saveEvents` wraps batch inserts in a database transaction.
- **Dynamic SQL building**: `buildFilterQuery` generates SQL with JOINs for tag filters, DISTINCT for dedup.
- **FTS5 triggers**: Search text auto-updates on insert/delete via database triggers.
- **Default search limit**: 50 results unless specified.

## Dependencies

- **Runtime**: `@ion/storage` (Database interface)
- **Downstream**: `@ion/storage` (foundation)
- **Upstream consumers**: Actions, features that manage Nostr events

## File Structure

```
src/
  index.ts
  types.ts                      # NostrEvent, NostrFilter, StoredEvent, PruneOptions
  event-repository.ts           # Core EventRepository implementation
  event-repository.test.ts
  build-filter-query.ts         # NostrFilter -> SQL query builder
  build-filter-query.test.ts
  build-search-text.ts          # Extract searchable text by event kind
  build-search-text.test.ts
migrations.ts                   # 3 schema migrations
```
