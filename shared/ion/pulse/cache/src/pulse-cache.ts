import { LRUCache } from 'lru-cache';

import type { PulseCacheConfig, PulseCacheInstance, PulseCacheStats } from './types';

const DEFAULT_MAX_SIZE_BYTES = 256 * 1024 * 1024;
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function estimateByteSize(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

export function createPulseCache(config?: PulseCacheConfig): PulseCacheInstance {
  const maxSizeBytes = config?.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const defaultTtlMs = config?.defaultTtlMs ?? DEFAULT_TTL_MS;

  let hitCount = 0;
  let missCount = 0;
  let evictionCount = 0;

  const cache = new LRUCache<string, unknown>({
    maxSize: maxSizeBytes,
    sizeCalculation: estimateByteSize,
    ttl: defaultTtlMs,
    dispose: (_value, _key, reason) => {
      if (reason === 'evict') {
        evictionCount++;
      }
    },
  });

  function get(soul: string): unknown | undefined {
    const value = cache.get(soul);
    if (value === undefined) {
      missCount++;
      return undefined;
    }
    hitCount++;
    return value;
  }

  function set(soul: string, value: unknown): void {
    cache.set(soul, value);
  }

  function invalidate(soul: string): boolean {
    return cache.delete(soul);
  }

  function getStats(): PulseCacheStats {
    return {
      hits: hitCount,
      misses: missCount,
      evictions: evictionCount,
      size: cache.size,
    };
  }

  function clear(): void {
    cache.clear();
  }

  return { get, set, invalidate, getStats, clear };
}
