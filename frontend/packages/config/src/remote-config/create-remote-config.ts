import { Logger } from '@ion/diagnostics';

import { getStoredVersion, updateTimestamp } from './config-cache';
import { createConfigMutex } from './config-mutex';
import { fetchConfigFromNetwork } from './fetch-config-from-network';
import { forceFetchConfig } from './force-fetch-config';
import { readCachedConfig } from './read-cached-config';
import { readStaleCache } from './read-stale-cache';
import { ConfigError } from './remote-config-error';
import type {
  CachedEntry,
  GetConfigOptions,
  RemoteConfigDeps,
  RemoteConfigOptions,
  RemoteConfigService,
} from './remote-config-types';

const DEFAULT_TIME_TO_LIVE_MS = 300_000; // 5 minutes

export function createRemoteConfig(options: RemoteConfigOptions): RemoteConfigService {
  const mutex = createConfigMutex();
  const deps: RemoteConfigDeps = {
    httpClient: options.httpClient,
    storage: options.storage,
    defaultTimeToLiveMs: options.defaultTimeToLiveMs ?? DEFAULT_TIME_TO_LIVE_MS,
    memoryCache: new Map<string, CachedEntry>(),
  };

  return {
    getConfig: <T>(getOptions: GetConfigOptions<T>) =>
      mutex.run(getOptions.configName, () => executeGetConfig(deps, getOptions)),
    clearLocks: () => mutex.clear(),
  };
}

async function executeGetConfig<T>(
  deps: RemoteConfigDeps,
  options: GetConfigOptions<T>,
): Promise<T> {
  const cached = readCachedConfig(deps, options);
  if (cached.value !== null) return cached.value;

  const version = cached.hadParseError ? 0 : getStoredVersion(deps.storage, options.configName);
  const networkResult = await tryNetworkFetch(deps, options, version);
  if (networkResult !== null) return networkResult;

  updateTimestamp(deps, options.configName);
  const stale = readStaleCache(deps, options);
  if (stale !== null) return stale;

  return forceFetchConfig(deps, options);
}

async function tryNetworkFetch<T>(
  deps: RemoteConfigDeps,
  options: GetConfigOptions<T>,
  version: number,
): Promise<T | null> {
  try {
    return await fetchConfigFromNetwork(deps, options, version);
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    Logger.error('Network fetch failed for remote config, falling back to cache', {
      tag: 'remote-config',
      data: { configName: options.configName },
      ...(error instanceof Error ? { error } : {}),
    });
    return null;
  }
}
