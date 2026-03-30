# @ion/media-upload Architecture

Media file upload to Greenfield blockchain with persistent queue, delegation protocol, retry, and cancellation support.

## Public API

```typescript
// Factory functions
export { createMediaUploader }       // (deps) => { uploadMedia }
export { createUploadCanceller }     // (deps) => { cancelUpload }
export { createUploadQueueInspector } // (deps) => { getUploadQueue }
export { createUploadRetrier }       // (deps) => { retryFailedUploads }

// Database migrations
export { uploadQueueMigrations }     // Migration[] for @ion/storage

// Types
export type { UploadInput, UploadResult, UploadProgress, UploadStatus, UploadDependencies }
```

## Core Data Structures

```typescript
interface UploadInput {
  uri: string;              // Blob or file URI
  mimeType: string;         // RFC 2045 MIME type
  fileSize: number;         // Positive integer (bytes)
}

interface UploadResult {
  objectName: string;       // Greenfield object identifier
  bucketName: string;       // Greenfield bucket identifier
  fileSize: number;
}

interface UploadProgress {
  uploadId: string;         // UUID
  status: UploadStatus;
  bytesUploaded: number;
  totalBytes: number;
}

type UploadStatus =
  | "queued"                  // Awaiting delegation
  | "requesting-delegation"   // Fetching Greenfield auth
  | "uploading"               // Transferring to Greenfield
  | "completed"
  | "failed"
  | "cancelled";
```

### Database Schema (`upload_queue` table)

| Column | Type | Notes |
|--------|------|-------|
| upload_id | TEXT PK | UUID |
| uri | TEXT | Original file location |
| mime_type | TEXT | RFC 2045 |
| file_size | INTEGER | Bytes |
| status | TEXT | UploadStatus |
| bucket_name | TEXT NULL | Set after delegation |
| object_name | TEXT NULL | Set after delegation |
| bytes_uploaded | INTEGER | Reserved (always 0) |
| error_message | TEXT NULL | Last error on failure |
| retry_count | INTEGER | Max 5 retries |
| created_at | INTEGER | Unix timestamp |
| updated_at | INTEGER | Unix timestamp |

## Upload Flow

```
uploadMedia(input, onProgress?)
  1. validateUploadInput()         -- URI, MIME type, fileSize
  2. generateUploadId()            -- UUID
  3. cancellationRegistry.register -- AbortController per upload
  4. repository.insertItem         -- status: "queued"
  5. requestDelegation()           -- POST /uploads/delegate
  6. repository.updateDelegation   -- store bucket/object names
  7. greenfieldUpload()            -- platform-specific upload
  8. repository.updateCompletion   -- status: "completed"
  9. return { objectName, bucketName, fileSize }
```

Progress callback fires at each status transition. On failure: status set to "failed", retry_count incremented, error logged and re-thrown.

## Cancellation Flow

```
cancelUpload(uploadId)
  1. cancellationRegistry.cancel   -- abort AbortSignal
  2. repository.updateStatusIfNotTerminal -- status: "cancelled"
```

Uses standard `AbortSignal` propagated to fetch/upload calls.

## Retry Flow

```
retryFailedUploads()
  1. Query all status="failed" uploads
  2. Skip if retry_count >= 5
  3. Request fresh delegation (new bucket/object)
  4. Re-attempt Greenfield upload
  5. Return UploadResult[] of successes
```

## Delegation Protocol

Backend endpoint `POST /uploads/delegate` returns:
```typescript
interface DelegationResponse {
  bucketName: string;
  objectName: string;
  authType: "EDDSA";
  domain: string;           // Storage provider domain
  seedString: string;       // EDDSA signing seed
  address: string;          // Sender address
}
```

Time-limited credentials. Fresh delegation requested on each retry.

## Platform Variants

| Platform | URI Scheme | Upload Mechanism | URI Validation |
|----------|-----------|-----------------|----------------|
| Web | `blob:` only | `fetch()` blob from URI | Rejects http:, data:, file: (SSRF) |
| Native | `file:`, `content:` | `expo-file-system` | Rejects `..` path traversal |

## Design Decisions

- **Persistent queue**: Uploads stored in SQLite via `@ion/storage`. Survives crashes, battery drain, network drops.
- **Separate delegation phase**: Greenfield requires signed auth from backend. Decoupling allows fresh credentials on retry.
- **AbortSignal cancellation**: Standard Web API, propagates to fetch and Greenfield client.
- **Max 5 retries**: Hard limit prevents infinite retry loops. Caller can retry manually beyond limit.
- **No resumable uploads**: Failed uploads restart from 0%. `bytesUploaded` column reserved for future enhancement.
- **Dependency injection**: All external deps (`httpClient`, `database`, `greenfieldClient`, `apiBaseUrl`) injected via factory functions.

## Dependencies

- **Runtime**: `@ion/network` (HttpClient), `@ion/storage` (Database), `@ion/diagnostics` (Logger)
- **Peer deps (optional)**: `@bnb-chain/greenfield-js-sdk`, `expo-file-system`
- **Downstream**: Foundation layer packages only
- **Upstream consumers**: `@ion/actions`

## File Structure

```
src/
  index.ts                           # Public API re-exports
  types.ts                           # All types and interfaces
  upload-media.ts                    # Main upload orchestrator
  upload-media.test.ts
  cancel-upload.ts                   # Cancellation control
  cancel-upload.test.ts
  upload-queue.ts                    # Queue inspection
  upload-queue.test.ts
  retry-failed-uploads.ts           # Retry orchestration
  retry-failed-uploads.test.ts
  upload-queue-repository.ts         # Database abstraction
  upload-queue-repository.test.ts
  request-delegation.ts              # Backend delegation request
  request-delegation.test.ts
  greenfield-upload.ts               # Web platform upload
  greenfield-upload.native.ts        # Native platform upload
  cancellation-registry.ts           # AbortController registry
  validate-upload-input.ts           # Input validation
  validate-upload-input.test.ts
  validate-uri.ts                    # URI scheme + safety checks
  validate-uri.test.ts
  generate-upload-id.ts              # UUID generation
  upload-queue-migrations.ts         # Database schema
```
