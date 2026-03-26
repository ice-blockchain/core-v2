import { LRUCache } from 'lru-cache';
import type { PulseCache, PulseCacheConfig } from './types';

const DEFAULT_MAX_SIZE_BYTES = 256 * 1024 * 1024;
const DEFAULT_TTL_MS = 300_000;

export function createPulseCache(config?: PulseCacheConfig): PulseCache {
  const maxSizeBytes = config?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const defaultTtlMs = config?.defaultTtlMs ?? DEFAULT_TTL_MS;

  let hits = 0;
  let misses = 0;
  let evictions = 0;
  let destroyed = false;

  const lru = new LRUCache<string, Uint8Array>({
    maxSize: maxSizeBytes,
    sizeCalculation: (value) => value.byteLength,
    ttl: defaultTtlMs,
    dispose: (_value, _key, reason) => {
      if (reason === 'evict') {
        evictions++;
      }
    },
  });

  function assertAlive(): void {
    if (destroyed) {
      throw new Error('Cache has been destroyed');
    }
  }

  function get(soul: string): Uint8Array | undefined {
    assertAlive();
    const value = lru.get(soul);
    if (value === undefined) {
      misses++;
    } else {
      hits++;
    }
    return value;
  }

  function set(soul: string, data: Uint8Array): void {
    assertAlive();
    lru.set(soul, data);
  }

  function invalidate(soul: string): boolean {
    assertAlive();
    return lru.delete(soul);
  }

  function invalidatePrefix(prefix: string): number {
    assertAlive();
    const keysToDelete = [...lru.keys()].filter((key) =>
      key.startsWith(prefix),
    );
    for (const key of keysToDelete) {
      lru.delete(key);
    }
    return keysToDelete.length;
  }

  function has(soul: string): boolean {
    assertAlive();
    return lru.has(soul);
  }

  function getStats() {
    return { hits, misses, evictions, size: lru.size, maxSize: maxSizeBytes };
  }

  function clear(): void {
    lru.clear();
    hits = 0;
    misses = 0;
    evictions = 0;
  }

  function destroy(): void {
    lru.clear();
    destroyed = true;
  }

  return {
    get,
    set,
    invalidate,
    invalidatePrefix,
    has,
    getStats,
    clear,
    destroy,
  };
}
