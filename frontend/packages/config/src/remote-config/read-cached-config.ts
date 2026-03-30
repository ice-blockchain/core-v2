import { readFromMemoryCache, readFromStorage, isExpired } from './config-cache';
import type { ConfigIdentity, RemoteConfigDeps } from './remote-config-types';

export interface CacheReadResult<T> {
  value: T | null;
  hadParseError: boolean;
}

export function readCachedConfig<T>(
  deps: RemoteConfigDeps,
  identity: ConfigIdentity<T>,
  timeToLiveMs: number,
): CacheReadResult<T> {
  const memoryEntry = readFromMemoryCache(deps.memoryCache, identity.configName, timeToLiveMs);
  if (memoryEntry) return tryParse(memoryEntry.raw, identity.parser);

  const storageEntry = readFromStorage(deps.storage, identity.configName);
  if (!storageEntry) return { value: null, hadParseError: false };
  if (isExpired(storageEntry.fetchedAtMs, timeToLiveMs)) return { value: null, hadParseError: false };

  return tryParse(storageEntry.raw, identity.parser);
}

function tryParse<T>(raw: string, parser: (raw: string) => T): CacheReadResult<T> {
  try {
    return { value: parser(raw), hadParseError: false };
  } catch {
    return { value: null, hadParseError: true };
  }
}
