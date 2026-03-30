import type { CachedEntry, ConfigStorage } from './remote-config-types';

const PREFIX = 'remote_config';

function dataKey(configName: string): string {
  return `${PREFIX}:data:${configName}`;
}

function versionKey(configName: string): string {
  return `${PREFIX}:version:${configName}`;
}

function timestampKey(configName: string): string {
  return `${PREFIX}:timestamp:${configName}`;
}

export function readFromMemoryCache(
  memoryCache: Map<string, CachedEntry>,
  configName: string,
  timeToLiveMs: number,
): CachedEntry | null {
  const entry = memoryCache.get(configName);
  if (!entry) return null;
  if (isExpired(entry.fetchedAtMs, timeToLiveMs)) return null;
  return entry;
}

export function readFromStorage(storage: ConfigStorage, configName: string): CachedEntry | null {
  const raw = storage.getString(dataKey(configName));
  if (!raw) return null;

  const version = storage.getNumber(versionKey(configName)) ?? 0;
  const fetchedAtMs = storage.getNumber(timestampKey(configName)) ?? 0;
  return { raw, version, fetchedAtMs };
}

export function writeToCache(
  deps: { storage: ConfigStorage; memoryCache: Map<string, CachedEntry> },
  configName: string,
  entry: CachedEntry,
): void {
  deps.memoryCache.set(configName, entry);
  deps.storage.setString(dataKey(configName), entry.raw);
  deps.storage.setNumber(versionKey(configName), entry.version);
  deps.storage.setNumber(timestampKey(configName), entry.fetchedAtMs);
}

export function updateTimestamp(
  deps: { storage: ConfigStorage; memoryCache: Map<string, CachedEntry> },
  configName: string,
): void {
  const now = Date.now();
  const existing = deps.memoryCache.get(configName);
  if (existing) {
    deps.memoryCache.set(configName, { ...existing, fetchedAtMs: now });
  }
  try {
    deps.storage.setNumber(timestampKey(configName), now);
  } catch {
    // best-effort — swallow storage errors on timestamp update
  }
}

export function getStoredVersion(storage: ConfigStorage, configName: string): number {
  return storage.getNumber(versionKey(configName)) ?? 0;
}

export function isExpired(fetchedAtMs: number, timeToLiveMs: number): boolean {
  return Date.now() - fetchedAtMs >= timeToLiveMs;
}

export function clearConfigFromCache(
  deps: { storage: ConfigStorage; memoryCache: Map<string, CachedEntry> },
  configName: string,
): void {
  deps.memoryCache.delete(configName);
  deps.storage.removeItem(dataKey(configName));
  deps.storage.removeItem(versionKey(configName));
  deps.storage.removeItem(timestampKey(configName));
}
