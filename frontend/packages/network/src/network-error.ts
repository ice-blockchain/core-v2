import type { NetworkErrorCode } from './shared-types';

interface NetworkErrorOptions {
  code: NetworkErrorCode;
  message: string;
  status?: number | undefined;
  responseBody?: unknown;
  retryAfterMs?: number | undefined;
  timeoutMs?: number | undefined;
  rawBody?: string | undefined;
  requestUrl?: string | undefined;
  shouldRetry?: boolean | undefined;
}

export class NetworkError extends Error {
  readonly code: NetworkErrorCode;
  readonly status?: number | undefined;
  readonly responseBody?: unknown;
  readonly retryAfterMs?: number | undefined;
  readonly timeoutMs?: number | undefined;
  readonly rawBody?: string | undefined;
  readonly requestUrl?: string | undefined;
  readonly shouldRetry?: boolean | undefined;

  constructor(options: NetworkErrorOptions) {
    super(options.message);
    this.name = 'NetworkError';
    this.code = options.code;
    this.status = options.status;
    this.responseBody = options.responseBody;
    this.retryAfterMs = options.retryAfterMs;
    this.timeoutMs = options.timeoutMs;
    this.rawBody = options.rawBody;
    this.requestUrl = options.requestUrl;
    this.shouldRetry = options.shouldRetry;
  }
}
