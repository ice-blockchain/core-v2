import { describe, it, expect, vi } from 'vitest';

import { readStaleCache } from './read-stale-cache';
import type { RemoteConfigDeps, CachedEntry, ConfigStorage } from './remote-config-types';

function createMockStorage(): ConfigStorage {
  const store = new Map<string, string | number>();
  return {
    getString: vi.fn((key: string) => (store.get(key) as string) ?? null),
    setString: vi.fn((key: string, value: string) => store.set(key, value)),
    getNumber: vi.fn((key: string) => (store.get(key) as number) ?? null),
    setNumber: vi.fn((key: string, value: number) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
  };
}

function createDeps(storage: ConfigStorage): RemoteConfigDeps {
  return {
    httpClient: { get: vi.fn() },
    storage,
    baseUrl: 'https://api.example.com',
    defaultTimeToLiveMs: 60_000,
    memoryCache: new Map<string, CachedEntry>(),
  };
}

const parser = (raw: string) => JSON.parse(raw) as { value: number };

describe('readStaleCache', () => {
  it('returns parsed data even when expired', () => {
    const storage = createMockStorage();
    storage.setString('remote_config:data:cfg', '{"value":99}');
    storage.setNumber('remote_config:timestamp:cfg', 0);

    const result = readStaleCache(createDeps(storage), { configName: 'cfg', parser });

    expect(result).toEqual({ value: 99 });
  });

  it('returns null when nothing is cached', () => {
    const result = readStaleCache(createDeps(createMockStorage()), { configName: 'missing', parser });

    expect(result).toBeNull();
  });

  it('returns null when cached data fails to parse', () => {
    const storage = createMockStorage();
    storage.setString('remote_config:data:cfg', 'broken');

    const result = readStaleCache(createDeps(storage), { configName: 'cfg', parser });

    expect(result).toBeNull();
  });
});
