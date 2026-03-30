import { Logger } from '@ion/diagnostics';
import { createHttpClient } from '@ion/network';

import { environmentConfig } from '../environment/environment';

import { getStoredVersion } from './config-cache';
import { createConfigMutex } from './config-mutex';
import { fetchConfigFromNetwork } from './fetch-config-from-network';
import { forceFetchConfig } from './force-fetch-config';
import { readCachedConfig } from './read-cached-config';
import { readStaleCache } from './read-stale-cache';
import { ConfigError, ConfigErrorCode } from './remote-config-error';
import type {
  CachedEntry,
  ConfigIdentity,
  GetConfigOptions,
  RemoteConfigDeps,
  RemoteConfigOptions,
  RemoteConfigService,
} from './remote-config-types';
import { createKeyValueStorage } from '@ion/storage';

const DEFAULT_REFRESH_INTERVAL = 300_000; // 5 minutes
const VALID_CONFIG_NAME = /^[a-zA-Z0-9-]+$/;

function validateConfigName(configName: string): void {
  if (!VALID_CONFIG_NAME.test(configName)) {
    throw new ConfigError(
      ConfigErrorCode.CONFIG_FETCH_FAILED,
      `Invalid configName "${configName}": must match ${VALID_CONFIG_NAME}`,
    );
  }
}

export function remoteConfigRepository(options?: RemoteConfigOptions): RemoteConfigService {
  const mutex = createConfigMutex();
  const httpClient = options?.httpClient ?? createHttpClient({ baseUrl: environmentConfig.apiBaseUrl });
  const storage = options?.storage ?? createKeyValueStorage({ id: 'remote-config' });
  const deps: RemoteConfigDeps = {
    httpClient,
    storage,
    memoryCache: new Map<string, CachedEntry>(),
  };

  return {
    getConfig: <T>(getOptions: GetConfigOptions<T>) => {
      validateConfigName(getOptions.configName);
      const identity: ConfigIdentity<T> = {
        configName: getOptions.configName,
        parser: getOptions.parser,
        checkVersion: getOptions.checkVersion ?? false,
      };
      const timeToLiveMs = getOptions.timeToLiveMs ?? DEFAULT_REFRESH_INTERVAL;
      return mutex.run(identity.configName, () => executeGetConfig(deps, identity, timeToLiveMs));
    },
    clearLocks: () => mutex.clear(),
  };
}

async function executeGetConfig<T>(
  deps: RemoteConfigDeps,
  identity: ConfigIdentity<T>,
  timeToLiveMs: number,
): Promise<T> {
  const tag = 'remote-config';
  const { configName } = identity;

  const cached = readCachedConfig(deps, identity, timeToLiveMs);
  if (cached.value !== null) {
    Logger.debug('Serving config from cache', { tag, data: { configName } });
    return cached.value;
  }

  const version = cached.hadParseError ? 0 : getStoredVersion(deps.storage, configName);
  const networkResult = await tryNetworkFetch(deps, identity, version);
  if (networkResult !== null) {
    Logger.info('Config fetched from network', { tag, data: { configName, version } });
    return networkResult;
  }

  const stale = readStaleCache(deps, identity);
  if (stale !== null) {
    Logger.warning('Serving stale config after network failure', { tag, data: { configName } });
    return stale;
  }

  Logger.warning('All caches empty, force-fetching config', { tag, data: { configName } });
  return forceFetchConfig(deps, identity);
}

async function tryNetworkFetch<T>(
  deps: RemoteConfigDeps,
  identity: ConfigIdentity<T>,
  version: number,
): Promise<T | null> {
  try {
    return await fetchConfigFromNetwork(deps, identity, version);
  } catch (error) {
    if (error instanceof ConfigError && error.code !== ConfigErrorCode.CONFIG_FETCH_FAILED) throw error;
    Logger.error('Network fetch failed for remote config, falling back to cache', {
      tag: 'remote-config',
      data: { configName: identity.configName },
      ...(error instanceof Error ? { error } : {}),
    });
    return null;
  }
}
