import type { NetworkErrorCode } from './shared-types';

interface NetworkErrorOptions {
  code: NetworkErrorCode;
  message: string;
  status?: number;
  responseBody?: unknown;
  retryAfterMs?: number;
  timeoutMs?: number;
  rawBody?: string;
}

export class NetworkError extends Error {
  readonly code: NetworkErrorCode;
  readonly status?: number | undefined;
  readonly responseBody?: unknown;
  readonly retryAfterMs?: number | undefined;
  readonly timeoutMs?: number | undefined;
  readonly rawBody?: string | undefined;

  constructor(options: NetworkErrorOptions) {
    super(options.message);
    this.name = 'NetworkError';
    this.code = options.code;
    this.status = options.status;
    this.responseBody = options.responseBody;
    this.retryAfterMs = options.retryAfterMs;
    this.timeoutMs = options.timeoutMs;
    this.rawBody = options.rawBody;
  }
}
