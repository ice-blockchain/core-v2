import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHttpClient } from './http-client';
import { NetworkError } from './network-error';

vi.mock('@ion/diagnostics', () => ({
  Logger: {
    debug: vi.fn(), warning: vi.fn(), info: vi.fn(),
    error: vi.fn(), addBreadcrumb: vi.fn(),
  },
}));

const mockRequest = vi.fn();
vi.mock('axios', () => ({
  default: {
    create: () => ({ request: mockRequest }),
    isCancel: (e: unknown) => e instanceof Object && (e as Record<string, unknown>).__CANCEL__ === true,
    isAxiosError: (e: unknown) => e instanceof Object && (e as Record<string, unknown>).isAxiosError === true,
  },
}));

function mockAxiosResponse(data: unknown, status = 200): Record<string, unknown> {
  return { status, data, headers: { 'content-type': 'application/json' }, config: { url: 'https://api.example.com/test' } };
}

describe('createHttpClient GET requests', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockRequest.mockReset(); });

  it('makes GET request and parses JSON', async () => {
    mockRequest.mockResolvedValue(mockAxiosResponse({ id: 1, name: 'Alice' }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com' });
    const result = await client.get<{ id: number; name: string }>('/users/1');
    expect(result).toEqual({ id: 1, name: 'Alice' });
  });

  it('interpolates path params', async () => {
    mockRequest.mockResolvedValue(mockAxiosResponse({ id: 42 }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com' });
    await client.get('/users/:id', { params: { id: '42' } });
    expect(mockRequest.mock.calls[0]![0].url).toContain('/users/42');
  });
});

describe('createHttpClient POST requests', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockRequest.mockReset(); });

  it('sends POST with JSON body', async () => {
    mockRequest.mockResolvedValue(mockAxiosResponse({ created: true }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com' });
    const result = await client.post<{ created: boolean }>('/users', { body: { name: 'Bob' } });
    expect(result).toEqual({ created: true });
  });
});

describe('createHttpClient error handling', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockRequest.mockReset(); });

  it('throws on 500 server error', async () => {
    mockRequest.mockResolvedValue(mockAxiosResponse({ error: 'Internal' }, 500));
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

describe('createHttpClient classifies network error as NETWORK_OFFLINE', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockRequest.mockReset(); });

  it('maps ERR_NETWORK to NETWORK_OFFLINE', async () => {
    const axiosError = Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' });
    mockRequest.mockRejectedValue(axiosError);
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      retryConfig: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0, jitterFactor: 0 },
    });
    try {
      await client.get('/fail');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).code).toBe('NETWORK_OFFLINE');
    }
  });
});

describe('createHttpClient classifies timeout as NETWORK_TIMEOUT', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockRequest.mockReset(); });

  it('maps ETIMEDOUT to NETWORK_TIMEOUT', async () => {
    const axiosError = Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ETIMEDOUT' });
    mockRequest.mockRejectedValue(axiosError);
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      retryConfig: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0, jitterFactor: 0 },
    });
    try {
      await client.get('/fail');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).code).toBe('NETWORK_TIMEOUT');
    }
  });
});

describe('createHttpClient classifies cancel as REQUEST_ABORTED', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockRequest.mockReset(); });

  it('maps cancel to REQUEST_ABORTED', async () => {
    const cancelError = { __CANCEL__: true, message: 'canceled' };
    mockRequest.mockRejectedValue(cancelError);
    const client = createHttpClient({
      baseUrl: 'https://api.example.com',
      retryConfig: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0, jitterFactor: 0 },
    });
    try {
      await client.get('/fail');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).code).toBe('REQUEST_ABORTED');
    }
  });
});

describe('createHttpClient content-type validation', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockRequest.mockReset(); });

  it('throws PARSE_ERROR for HTML response', async () => {
    mockRequest.mockResolvedValue({
      status: 200, data: '<html>Error</html>',
      headers: { 'content-type': 'text/html' }, config: { url: 'https://api.example.com/test' },
    });
    const client = createHttpClient({ baseUrl: 'https://api.example.com' });
    await expect(client.get('/fail')).rejects.toThrow('HTML response');
  });

  it('throws PARSE_ERROR for text/plain response', async () => {
    mockRequest.mockResolvedValue({
      status: 200, data: 'plain text',
      headers: { 'content-type': 'text/plain' }, config: { url: 'https://api.example.com/test' },
    });
    const client = createHttpClient({ baseUrl: 'https://api.example.com' });
    await expect(client.get('/fail')).rejects.toThrow('text/plain');
  });
});

describe('createHttpClient HTTPS enforcement', () => {
  beforeEach(() => { vi.restoreAllMocks(); mockRequest.mockReset(); });

  it('rejects HTTP URLs at init time', () => {
    expect(() => createHttpClient({ baseUrl: 'http://api.example.com' })).toThrow('HTTPS required');
  });

  it('throws when isProduction is true with non-empty allowlist', () => {
    expect(() => createHttpClient({
      baseUrl: 'https://api.example.com',
      isProduction: true,
      httpsAllowlist: ['localhost'],
    })).toThrow('HTTPS allowlist must be empty in production');
  });
});
