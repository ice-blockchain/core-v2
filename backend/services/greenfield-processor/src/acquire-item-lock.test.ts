import { describe, it, expect, vi } from 'vitest';
import acquireItemLock from './acquire-item-lock.js';

function createMockRedis(setResult: string | null = 'OK') {
  return {
    set: vi.fn(async () => setResult),
    eval: vi.fn(async () => 1),
  };
}

describe('acquireItemLock', () => {
  it('acquires lock when key is not held', async () => {
    const redis = createMockRedis('OK');
    const result = await acquireItemLock(redis as never, 'bucket:obj:1');

    expect(result.acquired).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      'cdn:item-lock:bucket:obj:1',
      expect.any(String),
      'EX',
      1800,
      'NX',
    );
  });

  it('returns acquired false when key is already held', async () => {
    const redis = createMockRedis(null);
    const result = await acquireItemLock(redis as never, 'bucket:obj:1');

    expect(result.acquired).toBe(false);
  });

  it('release calls Lua script with correct key and value', async () => {
    const redis = createMockRedis('OK');
    const result = await acquireItemLock(redis as never, 'bucket:obj:1');
    await result.release();

    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('GET'),
      1,
      'cdn:item-lock:bucket:obj:1',
      expect.any(String),
    );
  });

  it('release is a no-op when lock was not acquired', async () => {
    const redis = createMockRedis(null);
    const result = await acquireItemLock(redis as never, 'bucket:obj:1');
    await result.release();

    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('generates unique lock values per call', async () => {
    const redis = createMockRedis('OK');
    await acquireItemLock(redis as never, 'a');
    await acquireItemLock(redis as never, 'b');

    const value1 = (redis.set.mock.calls[0] as unknown[])[1];
    const value2 = (redis.set.mock.calls[1] as unknown[])[1];
    expect(value1).not.toBe(value2);
  });
});
