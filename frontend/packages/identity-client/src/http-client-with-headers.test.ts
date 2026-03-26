import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { withDefaultHeaders } from './http-client-with-headers';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  };
}

describe('withDefaultHeaders', () => {
  it('injects default headers into GET requests', async () => {
    const inner = createMockHttpClient();
    const client = withDefaultHeaders(inner, { 'X-Client-ID': 'app1' });

    await client.get('/test', { headers: {} });

    expect(inner.get).toHaveBeenCalledWith('/test', {
      headers: { 'X-Client-ID': 'app1' },
    });
  });

  it('injects default headers into POST requests', async () => {
    const inner = createMockHttpClient();
    const client = withDefaultHeaders(inner, { 'X-Client-ID': 'app1' });

    await client.post('/test', { body: { key: 'val' }, headers: {} });

    expect(inner.post).toHaveBeenCalledWith('/test', {
      body: { key: 'val' },
      headers: { 'X-Client-ID': 'app1' },
    });
  });

  it('allows per-request headers to override defaults', async () => {
    const inner = createMockHttpClient();
    const client = withDefaultHeaders(inner, { 'X-Client-ID': 'app1' });

    await client.get('/test', { headers: { 'X-Client-ID': 'override' } });

    expect(inner.get).toHaveBeenCalledWith('/test', {
      headers: { 'X-Client-ID': 'override' },
    });
  });

  it('works when no request options are provided', async () => {
    const inner = createMockHttpClient();
    const client = withDefaultHeaders(inner, { 'X-Client-ID': 'app1' });

    await client.get('/test');

    expect(inner.get).toHaveBeenCalledWith('/test', {
      headers: { 'X-Client-ID': 'app1' },
    });
  });
});
