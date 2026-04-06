# @ion/file-storage Architecture

## Purpose
Download orchestration with CDN-first, TON Storage fallback. Provides persistent download queue, disk cache with LRU eviction, and progress tracking. Files downloaded via this package are cached locally and served from cache on subsequent requests.

## Data Flow

```text
downloadFile(fileId)
  → cache hit? → return localPath
  → resolveFile(fileId) → { cdnUrl, tonBagId, tonFileIndex }
  → try CDN download (fast HTTP via FileOperations)
  → on failure: fallback TON bag download (P2P via daemon)
  → register in cache, evict if over budget
  → return { fileId, localPath, fileSize }
```

## Data Structures

- `FileResolution` — Backend response: CDN URL + TON bag coordinates for a given file ID
- `DownloadQueueRecord` — Persistent download tracking (SQLite): status, progress, retry count
- `CacheRecord` — Persistent cache index (SQLite): local path, size, last access time
- `FileOperations` — Platform abstraction for file I/O (injected by consumer)

## API Surface

### High-level

| Export | Description |
|--------|-------------|
| `createFileDownloader(deps)` | Main download orchestrator with CDN→TON fallback |
| `createDownloadCanceller(deps)` | Cancel active downloads via AbortSignal |
| `createDownloadQueueInspector(deps)` | Query current download queue state |
| `createDownloadRetrier(deps)` | Retry all failed downloads (max 5 attempts) |
| `downloadQueueMigrations` | SQLite migrations for consumer to apply |

### `createFileDownloader` returns:
- `downloadFile(fileId, onProgress?)` — Download a file, returns `{ fileId, localPath, fileSize }`

## Dependencies

- `@ion/network` — `HttpClient` for backend file resolution API
- `@ion/storage` — `Database` for persistent download queue and cache index
- `@ion/ton-storage` — `TonStorageClient` for TON Storage bag downloads (fallback path)
- `@ion/diagnostics` — `Logger` for structured logging

## Database Schema

Two tables, applied via `downloadQueueMigrations`:

**`download_queue`** — Transient in-flight download tracking
- `download_id` (PK), `file_id`, `status`, `local_path`, `cdn_url`, `ton_bag_id`, `ton_file_index`
- `file_size`, `bytes_downloaded`, `error_message`, `retry_count`, `created_at`, `updated_at`

**`file_cache`** — Persistent cache index for LRU eviction
- `file_id` (PK), `local_path`, `file_size`, `created_at`, `last_accessed_at`

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| `FileOperations` injected | `Transport.download` is `notSupported` in axios transport; consumer wraps platform file APIs (`expo-file-system`, fetch+Blob) |
| CDN-first, TON fallback | CDN is fast HTTP; TON is P2P and slower but always available. Backend may return `cdnUrl: null` to force TON-only |
| Bag stays seeded after download | Design requirement: downloaded bags keep seeding to other peers via the daemon |
| Two-table schema | Download queue is transient (cleaned after completion); cache index is persistent (for LRU tracking) |
| Same patterns as `@ion/media-upload` | Factory functions, DI, repository pattern, cancellation registry, terminal state safety |
| LRU eviction optional | `maxCacheSizeBytes: undefined` means no eviction. Consumer controls cache policy |
