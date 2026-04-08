import type { Client as FtpClient } from 'basic-ftp';
import type { Logger } from 'pino';
import type { ValidatedEndpoint } from './validate-endpoint.js';

// ---------------------------------------------------------------------------
// Job payloads (match Go parser at greenfield-ingester/internal/parser)
// ---------------------------------------------------------------------------

export interface CreateObjectEventPayload {
  block_height: number;
  tx_hash: string;
  bucket_name: string;
  content_type: string;
  create_at: number;
  creator: string;
  object_name: string;
  payload_size: number;
  checksums: string[];
  version: number;
}

export interface UpdateObjectContentPayload {
  block_height: number;
  tx_hash: string;
  operator: string;
  bucket_name: string;
  object_name: string;
  payload_size: number;
  checksums: string[];
  version: number;
}

export type GreenfieldEventPayload =
  | CreateObjectEventPayload
  | UpdateObjectContentPayload;

export type EventType = 'EventCreateObject' | 'EventUpdateObjectContent';

/**
 * BullMQ job shape as written by the Go ingester:
 *   job.name  = "EventCreateObject" | "EventUpdateObjectContent"
 *   job.data  = raw event payload (CreateObjectEventPayload | UpdateObjectContentPayload)
 */
export type GreenfieldJobData = GreenfieldEventPayload;

// ---------------------------------------------------------------------------
// Upload pipeline types
// ---------------------------------------------------------------------------

export interface PendingUploadItem {
  bucketName: string;
  objectName: string;
  payloadSize: number;
  contentType: string;
  txHash: string;
  version: number;
  checksums: string[];
  retryCount?: number;
}

export interface UploadBatchJob {
  items: PendingUploadItem[];
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Storage provider discovery
// ---------------------------------------------------------------------------

export interface GreenfieldQueryClient {
  sp: {
    getSPUrlByBucket(bucketName: string): Promise<string>;
  };
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

export interface DownloadDeps {
  bucketName: string;
  objectName: string;
  payloadSize: number;
  spEndpoint: string;
  tempDir: string;
  maxDownloadSize: number;
  checksums: string[];
  maxSegmentSize: number;
  validatedEndpoint: ValidatedEndpoint;
  logger?: Logger;
}

// ---------------------------------------------------------------------------
// FTP upload
// ---------------------------------------------------------------------------

export interface FtpUploadDeps {
  localFilePath: string;
  remotePath: string;
  ftpClient: FtpClient;
  logger?: Logger;
}

// ---------------------------------------------------------------------------
// Upload metadata
// ---------------------------------------------------------------------------

export interface UploadMetadata {
  bucketName: string;
  objectName: string;
  contentType: string;
  size: number;
  cdnPath: string;
  uploadedAt: number;
  txHash: string;
  version: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface CdnUploaderConfig {
  redisUrl: string;
  greenfieldRpcUrl: string;
  greenfieldChainId: string;
  bunnyStorageZone: string;
  bunnyStoragePassword: string;
  bunnyStorageRegion: string;
  bunnyFtpHost: string;
  ftpSecure: boolean;
  ftpMaxConnections: number;
  httpUploadSizeLimit: number;
  maxDownloadSize: number;
  batchMaxSize: number;
  batchFlushIntervalMs: number;
  uploadConcurrency: number;
  port: number;
  logLevel: string;
  sourceQueueName: string;
  tempDir: string;
  allowedSpHostnamePattern: string;
  maxSegmentSize: number;
}
