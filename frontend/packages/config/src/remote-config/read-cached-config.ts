import { readFromMemoryCache, readFromStorage, isExpired } from './config-cache';
import type { GetConfigOptions, RemoteConfigDeps } from './remote-config-types';

export interface CacheReadResult<T> {
  value: T | null;
  hadParseError: boolean;
}

export function readCachedConfig<T>(
  deps: RemoteConfigDeps,
  options: GetConfigOptions<T>,
): CacheReadResult<T> {
  const timeToLiveMs = options.timeToLiveMs ?? deps.defaultTimeToLiveMs;

  const memoryEntry = readFromMemoryCache(deps.memoryCache, options.configName, timeToLiveMs);
  if (memoryEntry) return tryParse(memoryEntry.raw, options.parser);

  const storageEntry = readFromStorage(deps.storage, options.configName);
  if (!storageEntry) return { value: null, hadParseError: false };
  if (isExpired(storageEntry.fetchedAtMs, timeToLiveMs)) return { value: null, hadParseError: false };

  return tryParse(storageEntry.raw, options.parser);
}

function tryParse<T>(raw: string, parser: (raw: string) => T): CacheReadResult<T> {
  try {
    return { value: parser(raw), hadParseError: false };
  } catch {
    return { value: null, hadParseError: true };
  }
}
