import type { IMemoryStorage, CacheOptions } from "./types";

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
  priority: "low" | "normal" | "high";
  lastAccessedAt: number;
}

interface MemoryStorageOptions {
  maxSize: number;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  low: 0,
  normal: 1,
  high: 2,
};

function findEvictionKey(
  store: Map<string, CacheEntry<unknown>>,
): string | undefined {
  let evictKey: string | undefined;
  let evictPriority = Infinity;
  let evictTime = Infinity;

  for (const [key, entry] of store) {
    const weight = PRIORITY_WEIGHT[entry.priority] ?? 1;
    if (
      weight < evictPriority ||
      (weight === evictPriority && entry.lastAccessedAt < evictTime)
    ) {
      evictPriority = weight;
      evictTime = entry.lastAccessedAt;
      evictKey = key;
    }
  }

  return evictKey;
}

export function createMemoryStorage(options: MemoryStorageOptions): IMemoryStorage {
  const { maxSize } = options;
  const store = new Map<string, CacheEntry<unknown>>();

  function isExpired(entry: CacheEntry<unknown>): boolean {
    return entry.expiresAt !== null && Date.now() >= entry.expiresAt;
  }

  function evictExpired(): void {
    for (const [key, entry] of store) {
      if (isExpired(entry)) {
        store.delete(key);
      }
    }
  }

  function evictLeastValuable(): void {
    const key = findEvictionKey(store);
    if (key !== undefined) {
      store.delete(key);
    }
  }

  return {
    get<T>(key: string): T | null {
      const entry = store.get(key);
      if (!entry) return null;
      if (isExpired(entry)) {
        store.delete(key);
        return null;
      }
      entry.lastAccessedAt = Date.now();
      return entry.value as T;
    },

    set<T>(key: string, value: T, cacheOptions?: CacheOptions): void {
      if (store.has(key)) {
        store.delete(key);
      } else if (store.size >= maxSize) {
        evictExpired();
        if (store.size >= maxSize) {
          evictLeastValuable();
        }
      }

      store.set(key, {
        value,
        expiresAt: cacheOptions?.timeToLiveMs
          ? Date.now() + cacheOptions.timeToLiveMs
          : null,
        priority: cacheOptions?.priority ?? "normal",
        lastAccessedAt: Date.now(),
      });
    },

    remove(key: string): void {
      store.delete(key);
    },

    has(key: string): boolean {
      const entry = store.get(key);
      if (!entry) return false;
      if (isExpired(entry)) {
        store.delete(key);
        return false;
      }
      return true;
    },

    clear(): void {
      store.clear();
    },

    size(): number {
      evictExpired();
      return store.size;
    },
  };
}
