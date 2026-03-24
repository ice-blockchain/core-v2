import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHttpClient } from './http-client';

vi.mock('@ion/diagnostics', () => ({
  Logger: {
    debug: vi.fn(), warning: vi.fn(), info: vi.fn(),
    error: vi.fn(), addBreadcrumb: vi.fn(),
  },
}));

const mockFetchResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('createHttpClient GET requests', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('makes GET request and parses JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockFetchResponse({ id: 1, name: 'Alice' }),
    ));
    const client = createHttpClient({ baseUrl: 'https://api.example.com' });
    const result = await client.get<{ id: number; name: string }>('/users/1');
    expect(result).toEqual({ id: 1, name: 'Alice' });
  });

  it('interpolates path params', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockFetchResponse({ id: 42 }),
    ));
    const client = createHttpClient({ baseUrl: 'https://api.example.com' });
    await client.get('/users/:id', { params: { id: '42' } });
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0].url).toContain('/users/42');
  });
});

describe('createHttpClient POST requests', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('sends POST with JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockFetchResponse({ created: true }),
    ));
    const client = createHttpClient({ baseUrl: 'https://api.example.com' });
    const result = await client.post<{ created: boolean }>('/users', { body: { name: 'Bob' } });
    expect(result).toEqual({ created: true });
  });
});

describe('createHttpClient error handling', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('throws on 500 server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockFetchResponse({ error: 'Internal' }, 500),
    ));
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      retryConfig: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0, jitterFactor: 0 },
    });
    await expect(client.get('/fail')).rejects.toThrow('Server error: 500');
  });

  it('rejects body exceeding max request body size', async () => {
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      maxRequestBodySizeBytes: 10,
    });
    await expect(
      client.post('/data', { body: { data: 'x'.repeat(100) } }),
    ).rejects.toThrow('exceeds max size');
  });
});

describe('createHttpClient HTTPS enforcement', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('rejects HTTP URLs', async () => {
    const client = createHttpClient({ baseUrl: 'http://api.example.com' });
    await expect(client.get('/users')).rejects.toThrow('HTTPS required');
  });

  it('throws when isProduction is true with non-empty allowlist', () => {
    expect(() => createHttpClient({
      baseUrl: 'https://api.example.com',
      isProduction: true,
      httpsAllowlist: ['localhost'],
    })).toThrow('HTTPS allowlist must be empty in production');
  });

});
