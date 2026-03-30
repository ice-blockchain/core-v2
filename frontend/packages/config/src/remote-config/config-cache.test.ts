import { describe, it, expect, vi } from 'vitest';

import type { CachedEntry, ConfigStorage } from './remote-config-types';
import {
  readFromMemoryCache,
  readFromStorage,
  writeToCache,
  updateTimestamp,
  getStoredVersion,
  isExpired,
  clearConfigFromCache,
} from './config-cache';

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

describe('readFromMemoryCache', () => {
  it('returns entry when fresh', () => {
    const cache = new Map<string, CachedEntry>();
    const entry: CachedEntry = { raw: '{}', version: 1, fetchedAtMs: Date.now() };
    cache.set('test', entry);

    expect(readFromMemoryCache(cache, 'test', 60_000)).toBe(entry);
  });

  it('returns null when expired', () => {
    const cache = new Map<string, CachedEntry>();
    cache.set('test', { raw: '{}', version: 1, fetchedAtMs: Date.now() - 120_000 });

    expect(readFromMemoryCache(cache, 'test', 60_000)).toBeNull();
  });

  it('returns null when missing', () => {
    expect(readFromMemoryCache(new Map(), 'missing', 60_000)).toBeNull();
  });
});

describe('readFromStorage', () => {
  it('returns entry when data exists', () => {
    const storage = createMockStorage();
    storage.setString('remote_config:data:cfg', '{"a":1}');
    storage.setNumber('remote_config:version:cfg', 5);
    storage.setNumber('remote_config:timestamp:cfg', 1000);

    const result = readFromStorage(storage, 'cfg');
    expect(result).toEqual({ raw: '{"a":1}', version: 5, fetchedAtMs: 1000 });
  });

  it('returns null when no data', () => {
    const storage = createMockStorage();
    expect(readFromStorage(storage, 'missing')).toBeNull();
  });

  it('defaults version and timestamp to 0', () => {
    const storage = createMockStorage();
    storage.setString('remote_config:data:cfg', 'raw');

    const result = readFromStorage(storage, 'cfg');
    expect(result).toEqual({ raw: 'raw', version: 0, fetchedAtMs: 0 });
  });
});

describe('writeToCache', () => {
  it('writes to both memory and storage', () => {
    const memoryCache = new Map<string, CachedEntry>();
    const storage = createMockStorage();
    const entry: CachedEntry = { raw: 'data', version: 3, fetchedAtMs: 5000 };

    writeToCache({ storage, memoryCache }, 'cfg', entry);

    expect(memoryCache.get('cfg')).toBe(entry);
    expect(storage.setString).toHaveBeenCalledWith('remote_config:data:cfg', 'data');
    expect(storage.setNumber).toHaveBeenCalledWith('remote_config:version:cfg', 3);
    expect(storage.setNumber).toHaveBeenCalledWith('remote_config:timestamp:cfg', 5000);
  });
});

describe('updateTimestamp', () => {
  it('updates memory cache and storage timestamp', () => {
    const memoryCache = new Map<string, CachedEntry>();
    memoryCache.set('cfg', { raw: 'x', version: 1, fetchedAtMs: 0 });
    const storage = createMockStorage();

    updateTimestamp({ storage, memoryCache }, 'cfg');

    const updated = memoryCache.get('cfg');
    expect(updated!.fetchedAtMs).toBeGreaterThan(0);
    expect(storage.setNumber).toHaveBeenCalled();
  });

  it('does not throw when storage fails', () => {
    const memoryCache = new Map<string, CachedEntry>();
    const storage = createMockStorage();
    storage.setNumber = vi.fn(() => { throw new Error('disk full'); });

    expect(() => updateTimestamp({ storage, memoryCache }, 'cfg')).not.toThrow();
  });
});

describe('getStoredVersion', () => {
  it('returns stored version', () => {
    const storage = createMockStorage();
    storage.setNumber('remote_config:version:cfg', 7);

    expect(getStoredVersion(storage, 'cfg')).toBe(7);
  });

  it('defaults to 0', () => {
    expect(getStoredVersion(createMockStorage(), 'missing')).toBe(0);
  });
});

describe('isExpired', () => {
  it('returns false when within TTL', () => {
    expect(isExpired(Date.now(), 60_000)).toBe(false);
  });

  it('returns true when past TTL', () => {
    expect(isExpired(Date.now() - 120_000, 60_000)).toBe(true);
  });
});

describe('clearConfigFromCache', () => {
  it('removes from memory and storage', () => {
    const memoryCache = new Map<string, CachedEntry>();
    memoryCache.set('cfg', { raw: 'x', version: 1, fetchedAtMs: 0 });
    const storage = createMockStorage();

    clearConfigFromCache({ storage, memoryCache }, 'cfg');

    expect(memoryCache.has('cfg')).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith('remote_config:data:cfg');
    expect(storage.removeItem).toHaveBeenCalledWith('remote_config:version:cfg');
    expect(storage.removeItem).toHaveBeenCalledWith('remote_config:timestamp:cfg');
  });
});
