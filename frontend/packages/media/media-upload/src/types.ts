import type { HttpClient } from "@ion/network";
import type { Database } from "@ion/storage";

// --- Public Types ---

export interface UploadInput {
  uri: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadResult {
  objectName: string;
  bucketName: string;
  fileSize: number;
}

export type UploadStatus =
  | "queued"
  | "requesting-delegation"
  | "uploading"
  | "completed"
  | "failed"
  | "cancelled";

export interface UploadProgress {
  uploadId: string;
  status: UploadStatus;
  bytesUploaded: number;
  totalBytes: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

export interface GreenfieldClient {
  object: {
    delegateUploadObject(
      params: { bucketName: string; objectName: string; body: File | Uint8Array },
      authOptions: { type: string; domain: string; seed: string; address: string },
    ): Promise<unknown>;
  };
}

export interface UploadDependencies {
  httpClient: HttpClient;
  database: Database;
  greenfieldClient: GreenfieldClient;
  apiBaseUrl: string;
}

// --- Internal Types ---

export interface DelegationResponse {
  bucketName: string;
  objectName: string;
  authType: "EDDSA";
  domain: string;
  seedString: string;
  address: string;
}

export interface UploadQueueRecord {
  upload_id: string;
  uri: string;
  mime_type: string;
  file_size: number;
  status: UploadStatus;
  bucket_name: string | null;
  object_name: string | null;
  bytes_uploaded: number;
  error_message: string | null;
  retry_count: number;
  created_at: number;
  updated_at: number;
}

export interface GreenfieldUploadParams {
  bucketName: string;
  objectName: string;
  uri: string;
  mimeType: string;
  auth: {
    type: string;
    domain: string;
    seedString: string;
    address: string;
  };
  signal: AbortSignal;
}
