import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateDelay,
  shouldRetry,
  parseRetryAfter,
  executeWithRetry,
} from './retry-handler';
import { NetworkError } from './network-error';

vi.mock('@ion/diagnostics', () => ({
  Logger: { debug: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe('calculateDelay', () => {
  it('applies exponential backoff', () => {
    const config = { maxRetries: 3, baseDelayMs: 200, maxDelayMs: 10000, jitterFactor: 0 };
    expect(calculateDelay(0, config)).toBe(200);
    expect(calculateDelay(1, config)).toBe(400);
    expect(calculateDelay(2, config)).toBe(800);
  });

  it('caps at maxDelayMs', () => {
    const config = { maxRetries: 3, baseDelayMs: 200, maxDelayMs: 500, jitterFactor: 0 };
    expect(calculateDelay(5, config)).toBe(500);
  });

  it('adds jitter within bounds', () => {
    const config = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000, jitterFactor: 0.3 };
    const delay = calculateDelay(0, config);
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(1300);
  });
});

describe('shouldRetry', () => {
  it('retries server errors for GET', () => {
    const error = new NetworkError({ code: 'SERVER_ERROR', message: 'fail', status: 500 });
    expect(shouldRetry(error, 'GET', false)).toBe(true);
  });

  it('retries rate limited errors', () => {
    const error = new NetworkError({ code: 'RATE_LIMITED', message: 'slow down', status: 429 });
    expect(shouldRetry(error, 'GET', false)).toBe(true);
  });

  it('does not retry client errors', () => {
    const error = new NetworkError({ code: 'CLIENT_ERROR', message: 'bad', status: 400 });
    expect(shouldRetry(error, 'GET', false)).toBe(false);
  });

  it('does not retry aborted requests', () => {
    const error = new NetworkError({ code: 'REQUEST_ABORTED', message: 'cancelled' });
    expect(shouldRetry(error, 'GET', false)).toBe(false);
  });

  it('does not retry POST by default', () => {
    const error = new NetworkError({ code: 'SERVER_ERROR', message: 'fail', status: 500 });
    expect(shouldRetry(error, 'POST', false)).toBe(false);
  });

  it('retries POST when retryable flag is set', () => {
    const error = new NetworkError({ code: 'SERVER_ERROR', message: 'fail', status: 500 });
    expect(shouldRetry(error, 'POST', true)).toBe(true);
  });

  it('retries TypeError from fetch', () => {
    expect(shouldRetry(new TypeError('Failed to fetch'), 'GET', false)).toBe(true);
  });
});

describe('parseRetryAfter', () => {
  it('parses integer seconds', () => {
    expect(parseRetryAfter('5', 30000)).toBe(5000);
  });

  it('caps at maxDelayMs', () => {
    expect(parseRetryAfter('999999', 10000)).toBe(10000);
  });

  it('returns null for unparseable value', () => {
    expect(parseRetryAfter('garbage', 10000)).toBeNull();
  });

  it('parses HTTP-date format', () => {
    const futureDate = new Date(Date.now() + 5000).toUTCString();
    const result = parseRetryAfter(futureDate, 30000);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(30000);
  });
});

describe('executeWithRetry success', () => {
  beforeEach(() => { vi.useFakeTimers(); });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await executeWithRetry({ executeFn: fn });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('executeWithRetry failure', () => {
  beforeEach(() => { vi.useRealTimers(); });

  it('retries and succeeds on second attempt', async () => {
    const error = new NetworkError({ code: 'SERVER_ERROR', message: 'fail', status: 500 });
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('ok');
    const config = { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 10, jitterFactor: 0 };
    const result = await executeWithRetry({ executeFn: fn, retryConfig: config });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries', async () => {
    const error = new NetworkError({ code: 'SERVER_ERROR', message: 'fail', status: 500 });
    const fn = vi.fn().mockRejectedValue(error);
    const config = { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 10, jitterFactor: 0 };
    await expect(executeWithRetry({ executeFn: fn, retryConfig: config })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn();
    await expect(
      executeWithRetry({ executeFn: fn, signal: controller.signal }),
    ).rejects.toThrow('Request aborted');
    expect(fn).not.toHaveBeenCalled();
  });
});
