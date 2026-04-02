import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createResilientProxyTransport } from './resilient-proxy-transport';
import type { ResilientTransportOptions } from './resilient-proxy-transport';
import type { Transport, TransportRequest } from '@ion/network';
import type { ProxyStatus } from './types';

vi.mock('@ion/diagnostics', () => ({
  Logger: { warning: vi.fn(), error: vi.fn() },
}));

function createMockTransport(): Transport {
  return {
    request: vi.fn().mockResolvedValue({ status: 200, headers: {}, body: 'ok' }),
    upload: vi.fn().mockResolvedValue({ status: 200, headers: {}, body: 'ok' }),
    download: vi.fn().mockResolvedValue({ status: 200, headers: {}, body: undefined }),
  };
}

function createOptions(overrides?: Partial<ResilientTransportOptions>): ResilientTransportOptions {
  return {
    innerTransport: createMockTransport(),
    onFailure: vi.fn(),
    onStatusChange: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  };
}

const dummyRequest: TransportRequest = { method: 'GET', url: 'http://test.ton/' };

beforeEach(() => vi.clearAllMocks());

describe('createResilientProxyTransport', () => {
  it('passes through successful requests', async () => {
    const opts = createOptions();
    const transport = createResilientProxyTransport(opts);
    const result = await transport.request(dummyRequest);
    expect(result).toEqual({ status: 200, headers: {}, body: 'ok' });
    expect(opts.onFailure).not.toHaveBeenCalled();
  });

  it('retries once after proxy error and reconnect', async () => {
    const inner = createMockTransport();
    let callCount = 0;
    (inner.request as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('PROXY_ERROR: connection refused'));
      return Promise.resolve({ status: 200, headers: {}, body: 'ok' });
    });

    let statusHandler: ((status: ProxyStatus) => void) | null = null;
    const opts = createOptions({
      innerTransport: inner,
      onStatusChange: (handler) => { statusHandler = handler; return () => {}; },
    });

    const resultPromise = transport();
    async function transport() {
      const t = createResilientProxyTransport(opts);
      return t.request(dummyRequest);
    }

    await vi.waitFor(() => expect(statusHandler).not.toBeNull());
    statusHandler!('connected');
    const result = await resultPromise;
    expect(result).toEqual({ status: 200, headers: {}, body: 'ok' });
    expect(opts.onFailure).toHaveBeenCalledOnce();
    expect(callCount).toBe(2);
  });

  it('throws non-proxy errors without retry', async () => {
    const inner = createMockTransport();
    (inner.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Parse error'));
    const opts = createOptions({ innerTransport: inner });
    const transport = createResilientProxyTransport(opts);
    await expect(transport.request(dummyRequest)).rejects.toThrow('Parse error');
    expect(opts.onFailure).not.toHaveBeenCalled();
  });

  it('rejects if proxy reconnect reaches disconnected state', async () => {
    const inner = createMockTransport();
    (inner.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('PROXY_ERROR'));

    let statusHandler: ((status: ProxyStatus) => void) | null = null;
    const opts = createOptions({
      innerTransport: inner,
      onStatusChange: (handler) => { statusHandler = handler; return () => {}; },
    });

    const resultPromise = createResilientProxyTransport(opts).request(dummyRequest);
    await vi.waitFor(() => expect(statusHandler).not.toBeNull());
    statusHandler!('disconnected');
    await expect(resultPromise).rejects.toThrow('Proxy reconnect failed');
  });
});
