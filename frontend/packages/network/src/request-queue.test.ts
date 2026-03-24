import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequestQueue } from './request-queue';
import type { QueuedRequest, QueueStorage } from './queue-types';

function createMockStorage(): QueueStorage {
  let items: QueuedRequest[] = [];
  return {
    load: vi.fn(async () => [...items]),
    save: vi.fn(async (newItems: QueuedRequest[]) => { items = newItems; }),
    clear: vi.fn(async () => { items = []; }),
  };
}

function createRequest(overrides?: Partial<QueuedRequest>): QueuedRequest {
  return {
    method: 'POST',
    url: 'https://api.example.com/data',
    body: { key: 'value' },
    headers: { Authorization: 'Bearer secret', 'content-type': 'application/json' },
    enqueuedAt: Date.now(),
    timeToLiveMs: 3_600_000,
    ...overrides,
  };
}

describe('RequestQueue enqueue', () => {
  it('enqueues and persists request', async () => {
    const storage = createMockStorage();
    const queue = createRequestQueue({ maxSize: 50, defaultTimeToLiveMs: 3600000, replayDelayMs: 0, storage });
    await queue.enqueue(createRequest());
    expect(await queue.getSize()).toBe(1);
  });

  it('strips auth headers before persisting', async () => {
    const storage = createMockStorage();
    const queue = createRequestQueue({ maxSize: 50, defaultTimeToLiveMs: 3600000, replayDelayMs: 0, storage });
    await queue.enqueue(createRequest());
    const saved = (storage.save as ReturnType<typeof vi.fn>).mock.calls[0]![0] as QueuedRequest[];
    expect(saved[0]!.headers!['Authorization']).toBeUndefined();
    expect(saved[0]!.headers!['authorization']).toBeUndefined();
    expect(saved[0]!.headers!['content-type']).toBe('application/json');
  });

  it('drops oldest when max size exceeded', async () => {
    const storage = createMockStorage();
    const queue = createRequestQueue({ maxSize: 2, defaultTimeToLiveMs: 3600000, replayDelayMs: 0, storage });
    await queue.enqueue(createRequest({ url: 'https://api.example.com/1' }));
    await queue.enqueue(createRequest({ url: 'https://api.example.com/2' }));
    await queue.enqueue(createRequest({ url: 'https://api.example.com/3' }));
    expect(await queue.getSize()).toBe(2);
  });
});

describe('RequestQueue events', () => {
  it('emits queue-changed on enqueue', async () => {
    const storage = createMockStorage();
    const queue = createRequestQueue({ maxSize: 50, defaultTimeToLiveMs: 3600000, replayDelayMs: 0, storage });
    const handler = vi.fn();
    queue.onQueueChanged(handler);
    await queue.enqueue(createRequest());
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('emits queue-changed on clear', async () => {
    const storage = createMockStorage();
    const queue = createRequestQueue({ maxSize: 50, defaultTimeToLiveMs: 3600000, replayDelayMs: 0, storage });
    const handler = vi.fn();
    await queue.enqueue(createRequest());
    queue.onQueueChanged(handler);
    await queue.clear();
    expect(handler).toHaveBeenCalledWith(0);
  });
});

describe('RequestQueue replay', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok'))); });

  it('replays in FIFO order and returns result', async () => {
    const storage = createMockStorage();
    const queue = createRequestQueue({ maxSize: 50, defaultTimeToLiveMs: 3600000, replayDelayMs: 0, storage });
    await queue.enqueue(createRequest());
    await queue.enqueue(createRequest());
    const result = await queue.replay();
    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('skips expired requests', async () => {
    const storage = createMockStorage();
    const queue = createRequestQueue({ maxSize: 50, defaultTimeToLiveMs: 3600000, replayDelayMs: 0, storage });
    await queue.enqueue(createRequest({ enqueuedAt: Date.now() - 7_200_000 }));
    const result = await queue.replay();
    expect(result.expired).toBe(1);
    expect(result.succeeded).toBe(0);
  });
});

describe('RequestQueue replay mutex', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok'))); });

  it('deduplicates concurrent replay calls', async () => {
    const storage = createMockStorage();
    const queue = createRequestQueue({ maxSize: 50, defaultTimeToLiveMs: 3600000, replayDelayMs: 0, storage });
    await queue.enqueue(createRequest());
    const [r1, r2, r3] = await Promise.all([queue.replay(), queue.replay(), queue.replay()]);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });
});
