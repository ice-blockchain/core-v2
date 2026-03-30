import { describe, it, expect, vi } from 'vitest';

import { readCachedConfig } from './read-cached-config';
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

function createDeps(overrides?: Partial<RemoteConfigDeps>): RemoteConfigDeps {
  return {
    httpClient: {
      get: vi.fn(), post: vi.fn(), put: vi.fn(),
      patch: vi.fn(), delete: vi.fn(), upload: vi.fn(),
    },
    storage: createMockStorage(),

    memoryCache: new Map<string, CachedEntry>(),
    ...overrides,
  };
}

describe('readCachedConfig', () => {
  const parser = (raw: string) => JSON.parse(raw) as { value: number };
  const identity = { configName: 'cfg', parser, checkVersion: false };

  it('returns value from fresh memory cache', () => {
    const memoryCache = new Map<string, CachedEntry>();
    memoryCache.set('cfg', { raw: '{"value":1}', version: 1, fetchedAtMs: Date.now() });
    const deps = createDeps({ memoryCache });

    const result = readCachedConfig(deps, identity, 60_000);

    expect(result.value).toEqual({ value: 1 });
    expect(result.hadParseError).toBe(false);
  });

  it('returns null when memory cache is expired', () => {
    const memoryCache = new Map<string, CachedEntry>();
    memoryCache.set('cfg', { raw: '{"value":1}', version: 1, fetchedAtMs: Date.now() - 120_000 });
    const deps = createDeps({ memoryCache });

    const result = readCachedConfig(deps, identity, 60_000);

    expect(result.value).toBeNull();
  });

  it('falls back to storage when memory cache misses', () => {
    const storage = createMockStorage();
    storage.setString('remote_config:data:cfg', '{"value":2}');
    storage.setNumber('remote_config:version:cfg', 1);
    storage.setNumber('remote_config:timestamp:cfg', Date.now());
    const deps = createDeps({ storage });

    const result = readCachedConfig(deps, identity, 60_000);

    expect(result.value).toEqual({ value: 2 });
  });

  it('returns null when storage entry is expired', () => {
    const storage = createMockStorage();
    storage.setString('remote_config:data:cfg', '{"value":2}');
    storage.setNumber('remote_config:version:cfg', 1);
    storage.setNumber('remote_config:timestamp:cfg', Date.now() - 120_000);
    const deps = createDeps({ storage });

    const result = readCachedConfig(deps, identity, 60_000);

    expect(result.value).toBeNull();
  });

  it('returns null with no cache at all', () => {
    const deps = createDeps();

    const result = readCachedConfig(deps, { configName: 'missing', parser, checkVersion: false }, 60_000);

    expect(result.value).toBeNull();
    expect(result.hadParseError).toBe(false);
  });

  it('returns hadParseError when cached data fails to parse', () => {
    const memoryCache = new Map<string, CachedEntry>();
    memoryCache.set('cfg', { raw: 'not-json', version: 1, fetchedAtMs: Date.now() });
    const deps = createDeps({ memoryCache });

    const result = readCachedConfig(deps, identity, 60_000);

    expect(result.value).toBeNull();
    expect(result.hadParseError).toBe(true);
  });

  it('uses per-config timeToLiveMs override', () => {
    const memoryCache = new Map<string, CachedEntry>();
    memoryCache.set('cfg', { raw: '{"value":1}', version: 1, fetchedAtMs: Date.now() - 5_000 });
    const deps = createDeps({ memoryCache });

    const result = readCachedConfig(deps, identity, 1_000);

    expect(result.value).toBeNull();
  });
});
