import { describe, it, expect, vi } from 'vitest';

import { readStaleCache } from './read-stale-cache';
import type { IKeyValueStorage } from '@ion/storage';

import type { RemoteConfigDeps, CachedEntry } from './remote-config-types';

function createMockStorage(): IKeyValueStorage {
  const store = new Map<string, unknown>();
  return {
    getString: vi.fn((key: string) => (store.get(key) as string) ?? null),
    setString: vi.fn((key: string, value: string) => { store.set(key, value); }),
    getNumber: vi.fn((key: string) => (store.get(key) as number) ?? null),
    setNumber: vi.fn((key: string, value: number) => { store.set(key, value); }),
    getBoolean: vi.fn(() => null),
    setBoolean: vi.fn(),
    getObject: vi.fn(() => null),
    setObject: vi.fn(),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    hasItem: vi.fn((key: string) => store.has(key)),
    clear: vi.fn(() => { store.clear(); }),
  };
}

function createDeps(storage: IKeyValueStorage): RemoteConfigDeps {
  return {
    httpClient: {
      get: vi.fn(), post: vi.fn(), put: vi.fn(),
      patch: vi.fn(), delete: vi.fn(), upload: vi.fn(),
    },
    storage,

    memoryCache: new Map<string, CachedEntry>(),
  };
}

const parser = (raw: string) => JSON.parse(raw) as { value: number };

describe('readStaleCache', () => {
  it('returns parsed data even when expired', () => {
    const storage = createMockStorage();
    storage.setString('remote_config:data:cfg', '{"value":99}');
    storage.setNumber('remote_config:timestamp:cfg', 0);

    const result = readStaleCache(createDeps(storage), { configName: 'cfg', parser, checkVersion: false });

    expect(result).toEqual({ value: 99 });
  });

  it('returns null when nothing is cached', () => {
    const result = readStaleCache(createDeps(createMockStorage()), { configName: 'missing', parser, checkVersion: false });

    expect(result).toBeNull();
  });

  it('returns null when cached data fails to parse', () => {
    const storage = createMockStorage();
    storage.setString('remote_config:data:cfg', 'broken');

    const result = readStaleCache(createDeps(storage), { configName: 'cfg', parser, checkVersion: false });

    expect(result).toBeNull();
  });
});
