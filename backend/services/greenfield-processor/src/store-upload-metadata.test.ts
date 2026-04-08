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
    zadd: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'zadd', args });
      return chain;
    }),
    zremrangebyscore: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'zremrangebyscore', args });
      return chain;
    }),
    exec: vi.fn(async () => []),
  };

  return {
    multi: vi.fn(() => chain),
    _chain: chain,
    _calls: calls,
  };
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
  it('stores metadata as hash and adds to recent-uploads', async () => {
    const redis = createMockRedis();

    await storeUploadMetadata(redis as never, testMetadata);

    expect(redis.multi).toHaveBeenCalledOnce();
    expect(redis._chain.hset).toHaveBeenCalledOnce();
    expect(redis._chain.zadd).toHaveBeenCalledWith(
      'cdn:recent-uploads',
      testMetadata.uploadedAt,
      'cdn:uploads:test-bucket:photo.png',
    );
  });

  it('removes entries older than 7 days by score', async () => {
    const redis = createMockRedis();

    await storeUploadMetadata(redis as never, testMetadata);

    const expectedCutoff = testMetadata.uploadedAt - SEVEN_DAYS_MS;
    expect(redis._chain.zremrangebyscore).toHaveBeenCalledWith(
      'cdn:recent-uploads',
      '-inf',
      expectedCutoff,
    );
  });

  it('executes all operations in a single multi transaction', async () => {
    const redis = createMockRedis();

    await storeUploadMetadata(redis as never, testMetadata);

    expect(redis._calls).toHaveLength(3);
    expect(redis._calls[0].method).toBe('hset');
    expect(redis._calls[1].method).toBe('zadd');
    expect(redis._calls[2].method).toBe('zremrangebyscore');
    expect(redis._chain.exec).toHaveBeenCalledOnce();
  });
});
