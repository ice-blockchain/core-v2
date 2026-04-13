import { describe, it, expect, vi } from 'vitest';
import storeUploadMetadata from './store-upload-metadata.js';
import type { UploadMetadata } from './types.js';

function createMockRedis() {
  const calls: { method: string; args: unknown[] }[] = [];

  const chain = {
    hset: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'hset', args });
      return chain;
    }),
    expire: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'expire', args });
      return chain;
    }),
    zadd: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'zadd', args });
      return chain;
    }),
    exec: vi.fn(async () => []),
  };

  return {
    multi: vi.fn(() => chain),
    eval: vi.fn(async () => 0),
    _chain: chain,
    _calls: calls,
  };
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const EIGHT_DAYS_SECONDS = 8 * 24 * 60 * 60;

const testMetadata: UploadMetadata = {
  bucketName: 'test-bucket',
  objectName: 'photo.png',
  contentType: 'image/png',
  size: 5000,
  cdnPath: 'test-bucket/photo.png',
  uploadedAt: 1700000000000,
  txHash: '0xabc',
  version: 1,
};

describe('storeUploadMetadata', () => {
  it('stores metadata with version in key and sets TTL', async () => {
    const redis = createMockRedis();

    await storeUploadMetadata(redis as never, testMetadata);

    expect(redis.multi).toHaveBeenCalledOnce();
    expect(redis._chain.hset).toHaveBeenCalledOnce();
    expect(redis._chain.expire).toHaveBeenCalledWith(
      'cdn:uploads:test-bucket:photo.png:1',
      EIGHT_DAYS_SECONDS,
    );
    expect(redis._chain.zadd).toHaveBeenCalledWith(
      'cdn:recent-uploads',
      testMetadata.uploadedAt,
      'cdn:uploads:test-bucket:photo.png:1',
    );
  });

  it('prunes expired entries via bounded Lua script', async () => {
    const redis = createMockRedis();

    await storeUploadMetadata(redis as never, testMetadata);

    const expectedCutoff = testMetadata.uploadedAt - SEVEN_DAYS_MS;
    expect(redis.eval).toHaveBeenCalledWith(
      expect.stringContaining('ZRANGEBYSCORE'),
      1,
      'cdn:recent-uploads',
      expectedCutoff,
    );
  });

  it('executes hset, expire, and zadd in multi, then prunes separately', async () => {
    const redis = createMockRedis();

    await storeUploadMetadata(redis as never, testMetadata);

    expect(redis._calls).toHaveLength(3);
    expect(redis._calls[0].method).toBe('hset');
    expect(redis._calls[1].method).toBe('expire');
    expect(redis._calls[2].method).toBe('zadd');
    expect(redis._chain.exec).toHaveBeenCalledOnce();
    expect(redis.eval).toHaveBeenCalledOnce();
  });
});
