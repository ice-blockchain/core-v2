import type { HttpClient } from '@ion/network';
import type { Database } from '@ion/storage';
import type { TonStorageClient } from '@ion/ton-storage';

// --- File Operations (platform abstraction) ---

export interface FileOperations {
  exists(path: string): Promise<boolean>;
  deleteFile(path: string): Promise<void>;
  getFileSize(path: string): Promise<number>;
  moveFile(options: MoveFileOptions): Promise<void>;
  downloadToFile(options: DownloadToFileOptions): Promise<void>;
}

export interface MoveFileOptions {
  sourcePath: string;
  destinationPath: string;
}

export interface DownloadToFileOptions {
  url: string;
  destinationPath: string;
  headers?: Record<string, string> | undefined;
  signal?: AbortSignal | undefined;
  onProgress?: DownloadProgressCallback | undefined;
}

// --- Download Status ---

export type DownloadStatus =
  | 'queued'
  | 'resolving'
  | 'downloading-cdn'
  | 'downloading-ton'
  | 'completed'
  | 'failed'
  | 'cancelled';

export const TERMINAL_STATUSES: readonly DownloadStatus[] = ['completed', 'cancelled'];

// --- Download Progress ---

export interface DownloadProgress {
  downloadId: string;
  fileId: string;
  status: DownloadStatus;
  bytesDownloaded: number;
  totalBytes: number;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

// --- Download Result ---

export interface DownloadResult {
  fileId: string;
  localPath: string;
  fileSize: number;
}

// --- File Resolution (from backend) ---

export interface FileResolution {
  fileId: string;
  cdnUrl: string | null;
  tonBagId: string | null;
  tonFileIndex: number | null;
  fileSize: number;
  mimeType: string;
}

// --- Dependencies ---

export interface FileStorageDependencies {
  httpClient: HttpClient;
  database: Database;
  apiBaseUrl: string;
  tonStorageClient: TonStorageClient;
  fileOperations: FileOperations;
  cacheDirectoryPath: string;
  maxCacheSizeBytes?: number | undefined;
}

// --- Database Records ---

export interface DownloadQueueRecord {
  download_id: string;
  file_id: string;
  status: DownloadStatus;
  local_path: string | null;
  cdn_url: string | null;
  ton_bag_id: string | null;
  ton_file_index: number | null;
  file_size: number;
  bytes_downloaded: number;
  error_message: string | null;
  retry_count: number;
  created_at: number;
  updated_at: number;
}

export interface CacheRecord {
  file_id: string;
  local_path: string;
  file_size: number;
  created_at: number;
  last_accessed_at: number;
}
