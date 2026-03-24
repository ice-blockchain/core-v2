import { describe, it, expect } from 'vitest';
import { NetworkError } from './network-error';

describe('NetworkError construction', () => {
  it('creates error with required fields', () => {
    const error = new NetworkError({
      code: 'NETWORK_TIMEOUT',
      message: 'Request timed out',
    });
    expect(error.code).toBe('NETWORK_TIMEOUT');
    expect(error.message).toBe('Request timed out');
    expect(error.name).toBe('NetworkError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NetworkError);
  });

  it('creates error with all optional fields', () => {
    const error = new NetworkError({
      code: 'SERVER_ERROR',
      message: 'Internal server error',
      status: 500,
      responseBody: { detail: 'Something broke' },
      retryAfterMs: 5000,
      timeoutMs: 30000,
      rawBody: '{"detail":"Something broke"}',
    });
    expect(error.status).toBe(500);
    expect(error.responseBody).toEqual({ detail: 'Something broke' });
    expect(error.retryAfterMs).toBe(5000);
    expect(error.timeoutMs).toBe(30000);
    expect(error.rawBody).toBe('{"detail":"Something broke"}');
  });
});

describe('NetworkError optional fields', () => {
  it('leaves optional fields undefined when not provided', () => {
    const error = new NetworkError({
      code: 'NETWORK_OFFLINE',
      message: 'No connection',
    });
    expect(error.status).toBeUndefined();
    expect(error.responseBody).toBeUndefined();
    expect(error.retryAfterMs).toBeUndefined();
    expect(error.timeoutMs).toBeUndefined();
    expect(error.rawBody).toBeUndefined();
  });

  it('preserves stack trace', () => {
    const error = new NetworkError({
      code: 'CLIENT_ERROR',
      message: 'Bad request',
    });
    expect(error.stack).toBeDefined();
  });
});

describe('NetworkError codes', () => {
  it('supports all error codes', () => {
    const codes = [
      'NETWORK_OFFLINE', 'NETWORK_TIMEOUT', 'REQUEST_ABORTED',
      'SERVER_ERROR', 'CLIENT_ERROR', 'AUTH_EXPIRED',
      'FORBIDDEN', 'RATE_LIMITED', 'PARSE_ERROR',
      'REDIRECT_LOOP', 'HTTPS_REQUIRED',
    ] as const;
    for (const code of codes) {
      const error = new NetworkError({ code, message: `${code} error` });
      expect(error.code).toBe(code);
    }
  });
});
