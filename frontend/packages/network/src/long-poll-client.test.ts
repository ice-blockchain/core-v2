import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLongPollClient } from './long-poll-client';
import type { HttpClient } from './http-types';

vi.mock('@ion/diagnostics', () => ({
  Logger: { debug: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    head: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  };
}

function syncResponse(inbox: Array<{ seq: string; data: unknown }>, cursor = 'c1') {
  return { status: 200, headers: {}, body: { inbox, cursor } };
}

describe('LongPollClient initial state', () => {
  it('starts in idle state', () => {
    const client = createLongPollClient({ url: '/poll', httpClient: createMockHttpClient() });
    expect(client.getState()).toBe('idle');
  });
});

describe('LongPollClient connect', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('transitions to connecting then connected on success', async () => {
    const http = createMockHttpClient();
    (http.post as ReturnType<typeof vi.fn>).mockResolvedValue(syncResponse([], 'c0'));
    const client = createLongPollClient({ url: '/poll', httpClient: http });
    const states: string[] = [];
    client.onStateChange((s) => states.push(s));
    client.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(states).toContain('connecting');
    expect(states).toContain('connected');
  });
});

describe('LongPollClient message delivery', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('delivers messages from poll response', async () => {
    const http = createMockHttpClient();
    (http.post as ReturnType<typeof vi.fn>).mockResolvedValue(
      syncResponse([{ seq: '1', data: { text: 'hello' } }], 'c1'),
    );
    const client = createLongPollClient({ url: '/poll', httpClient: http });
    const received: unknown[] = [];
    client.onMessage((msgs) => received.push(...msgs));
    client.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(received).toEqual([{ text: 'hello' }]);
  });
});

describe('LongPollClient cursor tracking', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sends updated cursor on subsequent polls', async () => {
    const http = createMockHttpClient();
    (http.post as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(syncResponse([{ seq: '1', data: 'a' }], 'cursor-1'))
      .mockResolvedValueOnce(syncResponse([], 'cursor-2'));
    const client = createLongPollClient({
      url: '/poll',
      httpClient: http,
      adaptivePolling: { minIntervalMs: 100, maxIntervalMs: 1000, idleIncrementMs: 100, backgroundIntervalMs: 5000 },
    });
    client.connect();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(200);
    const secondCall = (http.post as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(secondCall).toBeDefined();
    if (secondCall) {
      const body = secondCall[1]?.body;
      expect(JSON.parse(body as string).cursor).toBe('cursor-1');
    }
  });
});

describe('LongPollClient disconnect', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('transitions to disconnected on disconnect', async () => {
    const http = createMockHttpClient();
    (http.post as ReturnType<typeof vi.fn>).mockResolvedValue(syncResponse([], 'c0'));
    const client = createLongPollClient({ url: '/poll', httpClient: http });
    client.connect();
    await vi.advanceTimersByTimeAsync(0);
    client.disconnect();
    expect(client.getState()).toBe('disconnected');
  });
});

describe('LongPollClient reconnect', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('fires onReconnected when recovering from error', async () => {
    const http = createMockHttpClient();
    (http.post as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(syncResponse([], 'c0'));
    const client = createLongPollClient({
      url: '/poll',
      httpClient: http,
      retryConfig: { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 1000, jitterFactor: 0 },
    });
    const reconnected = vi.fn();
    client.onReconnected(reconnected);
    client.connect();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(200);
    expect(reconnected).toHaveBeenCalled();
  });
});

describe('LongPollClient adaptive polling', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('uses minInterval after receiving data', async () => {
    const http = createMockHttpClient();
    (http.post as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(syncResponse([{ seq: '1', data: 'msg' }], 'c1'))
      .mockResolvedValue(syncResponse([], 'c2'));
    const client = createLongPollClient({
      url: '/poll',
      httpClient: http,
      adaptivePolling: { minIntervalMs: 500, maxIntervalMs: 5000, idleIncrementMs: 1000, backgroundIntervalMs: 10000 },
    });
    client.connect();
    await vi.advanceTimersByTimeAsync(0);
    expect(http.post).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(http.post).toHaveBeenCalledTimes(2);
  });
});

describe('LongPollClient NetworkStateProvider', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('triggers immediate re-poll on network interface change', async () => {
    const http = createMockHttpClient();
    (http.post as ReturnType<typeof vi.fn>).mockResolvedValue(syncResponse([], 'c0'));
    let interfaceHandler: (() => void) | undefined;
    const provider = {
      isOnline: () => true,
      onStateChange: () => () => {},
      onNetworkInterfaceChange: (h: () => void) => { interfaceHandler = h; return () => {}; },
      dispose: () => {},
    };
    const client = createLongPollClient({
      url: '/poll', httpClient: http, networkStateProvider: provider,
      adaptivePolling: { minIntervalMs: 5000, maxIntervalMs: 30000, idleIncrementMs: 2000, backgroundIntervalMs: 60000 },
    });
    client.connect();
    await vi.advanceTimersByTimeAsync(0);
    const callsBefore = (http.post as ReturnType<typeof vi.fn>).mock.calls.length;
    interfaceHandler!();
    await vi.advanceTimersByTimeAsync(0);
    expect((http.post as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsBefore);
    client.disconnect();
  });
});
