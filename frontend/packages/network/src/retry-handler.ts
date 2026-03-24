import { Logger } from '@ion/diagnostics';
import type { RetryConfig } from './retry-types';
import { DEFAULT_RETRY_CONFIG } from './retry-types';
import { NetworkError } from './network-error';

interface RetryOptions<T> {
  executeFn: () => Promise<T>;
  retryConfig?: RetryConfig | undefined;
  method?: string | undefined;
  signal?: AbortSignal | undefined;
  retryable?: boolean | undefined;
}

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT']);

export function calculateDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const exponential = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs,
  );
  const jitter = Math.random() * config.jitterFactor * exponential;
  return exponential + jitter;
}

export function shouldRetry(
  error: unknown,
  method: string,
  retryable: boolean,
): boolean {
  if (!retryable && !IDEMPOTENT_METHODS.has(method.toUpperCase())) {
    return false;
  }
  if (error instanceof NetworkError) {
    if (error.code === 'REQUEST_ABORTED') return false;
    if (error.code === 'RATE_LIMITED') return true;
    if (error.code === 'SERVER_ERROR') return true;
    if (error.code === 'NETWORK_TIMEOUT') return true;
    if (error.code === 'NETWORK_OFFLINE') return true;
    return false;
  }
  return error instanceof TypeError;
}

export function parseRetryAfter(
  headerValue: string,
  maxDelayMs: number,
): number | null {
  const seconds = parseInt(headerValue, 10);
  if (!isNaN(seconds)) {
    return Math.min(seconds * 1000, maxDelayMs);
  }
  const date = Date.parse(headerValue);
  if (!isNaN(date)) {
    const delta = date - Date.now();
    return Math.min(Math.max(delta, 0), maxDelayMs);
  }
  return null;
}

export async function executeWithRetry<T>(
  options: RetryOptions<T>,
): Promise<T> {
  const config = options.retryConfig ?? DEFAULT_RETRY_CONFIG;
  const method = options.method ?? 'GET';
  const retryable = options.retryable ?? false;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (options.signal?.aborted) {
        throw new NetworkError({ code: 'REQUEST_ABORTED', message: 'Request aborted' });
      }
      return await options.executeFn();
    } catch (error) {
      const isLastAttempt = attempt === config.maxRetries;
      if (isLastAttempt || !shouldRetry(error, method, retryable)) {
        throw error;
      }
      const delayMs = getRetryDelay(error, attempt, config);
      Logger.debug('Retry attempt', {
        tag: 'network',
        data: { attempt: attempt + 1, delayMs, method },
      });
      await delay(delayMs);
    }
  }
  throw new NetworkError({ code: 'NETWORK_TIMEOUT', message: 'Max retries exceeded' });
}

function getRetryDelay(
  error: unknown,
  attempt: number,
  config: RetryConfig,
): number {
  if (error instanceof NetworkError && error.retryAfterMs) {
    return Math.min(error.retryAfterMs, config.maxDelayMs);
  }
  return calculateDelay(attempt, config);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
