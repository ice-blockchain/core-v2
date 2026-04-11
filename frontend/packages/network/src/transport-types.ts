export interface TransportRequest {
  method: string;
  url: string;
  headers?: Record<string, string> | undefined;
  body?: unknown;
  timeoutMs?: number | undefined;
  signal?: AbortSignal | undefined;
  query?: Record<string, string> | undefined;
  onProgress?: ((progress: { loaded: number; total: number }) => void) | undefined;
}

export interface TransportResponse<T> {
  status: number;
  headers: Record<string, string>;
  body: T | undefined;
}

export interface TransportUploadRequest extends TransportRequest {
  filePath: string;
  onProgress?: (progress: { loaded: number; total: number }) => void;
}

export interface TransportDownloadRequest {
  url: string;
  headers?: Record<string, string>;
  destinationPath: string;
  timeoutMs?: number;
}

export interface Transport {
  request<T>(config: TransportRequest): Promise<TransportResponse<T>>;
  upload<T>(config: TransportUploadRequest): Promise<TransportResponse<T>>;
  download(config: TransportDownloadRequest): Promise<TransportResponse<void>>;
}
