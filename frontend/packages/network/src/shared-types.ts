export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export type NetworkErrorCode =
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'REQUEST_ABORTED'
  | 'SERVER_ERROR'
  | 'CLIENT_ERROR'
  | 'AUTH_EXPIRED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'PARSE_ERROR'
  | 'REDIRECT_LOOP'
  | 'HTTPS_REQUIRED';

export interface CancelableRequest<T> {
  promise: Promise<T>;
  cancel: () => void;
}

export interface UploadProgress {
  bytesSent: number;
  bytesTotal: number;
  percentage: number;
}
