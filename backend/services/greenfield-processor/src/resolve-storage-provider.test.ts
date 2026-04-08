import { describe, it, expect, vi } from 'vitest';
import resolveStorageProvider from './resolve-storage-provider.js';
import type { GreenfieldQueryClient } from './types.js';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async () => ({ address: '203.0.113.50' })),
}));

function createMockRedis() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, val: string) => {
      store.set(key, val);
      return 'OK';
    }),
    _store: store,
  };
}

function createMockClient(spUrl: string): GreenfieldQueryClient {
  return {
    sp: {
      getSPUrlByBucket: vi.fn(async () => spUrl),
    },
  };
}

describe('resolveStorageProvider', () => {
  it('returns cached endpoint with fresh DNS validation', async () => {
    const redis = createMockRedis();
    redis._store.set(
      'greenfield-processor:bucket-sp:my-bucket',
      'https://cached-sp.example.com',
    );
    const client = createMockClient('https://sp.example.com');

    const result = await resolveStorageProvider(
      'my-bucket',
      client,
      redis as never,
    );

    expect(result.endpoint).toBe('https://cached-sp.example.com');
    expect(result.validatedEndpoint).toEqual({ ip: '203.0.113.50', family: 4 });
    expect(client.sp.getSPUrlByBucket).not.toHaveBeenCalled();
  });

  it('resolves SP from chain and caches in Redis', async () => {
    const redis = createMockRedis();
    const client = createMockClient('https://gnfd-testnet-sp1.bnbchain.org');

    const result = await resolveStorageProvider(
      'test-bucket',
      client,
      redis as never,
    );

    expect(result.endpoint).toBe('https://gnfd-testnet-sp1.bnbchain.org');
    expect(result.validatedEndpoint).toEqual({ ip: '203.0.113.50', family: 4 });
    expect(client.sp.getSPUrlByBucket).toHaveBeenCalledWith('test-bucket');
    expect(redis.set).toHaveBeenCalledWith(
      'greenfield-processor:bucket-sp:test-bucket',
      'https://gnfd-testnet-sp1.bnbchain.org',
      'EX',
      3600,
    );
  });

  it('strips trailing slash from SP endpoint', async () => {
    const redis = createMockRedis();
    const client = createMockClient('https://sp.example.com/');

    const result = await resolveStorageProvider(
      'test-bucket',
      client,
      redis as never,
    );

    expect(result.endpoint).toBe('https://sp.example.com');
  });

  it('rejects SP endpoint with private IP (SSRF)', async () => {
    const redis = createMockRedis();
    const client = createMockClient('http://169.254.169.254');

    await expect(resolveStorageProvider('test-bucket', client, redis as never))
      .rejects.toThrow('must use HTTPS');
  });

  it('rejects SP endpoint pointing to localhost (SSRF)', async () => {
    const redis = createMockRedis();
    const client = createMockClient('https://localhost:8080');

    await expect(resolveStorageProvider('test-bucket', client, redis as never))
      .rejects.toThrow('private host');
  });

  it('does not cache a rejected endpoint', async () => {
    const redis = createMockRedis();
    const client = createMockClient('http://10.0.0.1');

    await expect(resolveStorageProvider('test-bucket', client, redis as never))
      .rejects.toThrow();
    expect(redis.set).not.toHaveBeenCalled();
  });
});
