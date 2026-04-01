import { describe, it, expect, vi } from 'vitest';
import { NetworkError } from '@ion/network';
import type { HttpClient } from '@ion/network';
import { IdentityErrorCode } from '../errors';
import { verifyEarlyAccessEmail } from './verify-early-access-email';

function createMockHttpClient(response?: unknown, error?: Error): HttpClient {
  const get = error
    ? vi.fn(() => Promise.reject(error))
    : vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: response ?? {} }));
  return { get, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } as unknown as HttpClient;
}

describe('verifyEarlyAccessEmail', () => {
  it('resolves for eligible email', async () => {
    const httpClient = createMockHttpClient();
    await expect(verifyEarlyAccessEmail('good@example.com', { httpClient })).resolves.toBeUndefined();
    expect(httpClient.get).toHaveBeenCalledWith('/v1/early-access-users', { query: { email: 'good@example.com' } });
  });

  it('throws INVALID_EMAIL when response contains error code', async () => {
    const error = new NetworkError({
      code: 'CLIENT_ERROR',
      message: 'Bad request',
      status: 400,
      responseBody: { code: 'INVALID_EMAIL' },
    });
    const httpClient = createMockHttpClient(undefined, error);
    await expect(verifyEarlyAccessEmail('bad@example.com', { httpClient })).rejects.toMatchObject({
      code: IdentityErrorCode.INVALID_EMAIL,
    });
  });

  it('re-throws network errors without code in body', async () => {
    const error = new NetworkError({ code: 'SERVER_ERROR', message: 'Internal', status: 500 });
    const httpClient = createMockHttpClient(undefined, error);
    await expect(verifyEarlyAccessEmail('test@example.com', { httpClient })).rejects.toBe(error);
  });

  it('re-throws non-network errors', async () => {
    const error = new TypeError('unexpected');
    const httpClient = createMockHttpClient(undefined, error);
    await expect(verifyEarlyAccessEmail('test@example.com', { httpClient })).rejects.toBe(error);
  });
});
