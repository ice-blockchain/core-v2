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

function isExpired(entry: CacheEntry<unknown>): boolean {
  return entry.expiresAt !== null && Date.now() >= entry.expiresAt;
}

function evictExpired(store: Map<string, CacheEntry<unknown>>): void {
  for (const [key, entry] of store) {
    if (isExpired(entry)) {
      store.delete(key);
    }
  }
}

function evictLeastValuable(store: Map<string, CacheEntry<unknown>>): void {
  const key = findEvictionKey(store);
  if (key !== undefined) {
    store.delete(key);
  }
}

function makeEntry<T>(value: T, cacheOptions?: CacheOptions): CacheEntry<T> {
  return {
    value,
    expiresAt: cacheOptions?.timeToLiveMs
      ? Date.now() + cacheOptions.timeToLiveMs
      : null,
    priority: cacheOptions?.priority ?? "normal",
    lastAccessedAt: Date.now(),
  };
}

function getFromStore<T>(store: Map<string, CacheEntry<unknown>>, key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (isExpired(entry)) {
    store.delete(key);
    return null;
  }
  entry.lastAccessedAt = Date.now();
  return entry.value as T;
}

interface SetOptions<T> {
  store: Map<string, CacheEntry<unknown>>;
  maxSize: number;
  key: string;
  value: T;
  cacheOptions?: CacheOptions | undefined;
}

function setInStore<T>(options: SetOptions<T>): void {
  const { store, maxSize, key, value, cacheOptions } = options;
  if (store.has(key)) {
    store.delete(key);
  } else if (store.size >= maxSize) {
    evictExpired(store);
    if (store.size >= maxSize) {
      evictLeastValuable(store);
    }
  }
  store.set(key, makeEntry(value, cacheOptions));
}

function hasInStore(store: Map<string, CacheEntry<unknown>>, key: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  if (isExpired(entry)) {
    store.delete(key);
    return false;
  }
  return true;
}

export function createMemoryStorage(options: MemoryStorageOptions): IMemoryStorage {
  const { maxSize } = options;
  const store = new Map<string, CacheEntry<unknown>>();

  return {
    get: <T>(key: string) => getFromStore<T>(store, key),
    set: <T>(key: string, value: T, cacheOptions?: CacheOptions) =>
      setInStore({ store, maxSize, key, value, cacheOptions }),
    remove: (key: string) => store.delete(key),
    has: (key: string) => hasInStore(store, key),
    clear: () => store.clear(),
    size(): number {
      evictExpired(store);
      return store.size;
    },
  };
}
