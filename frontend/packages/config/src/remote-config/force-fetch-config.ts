import { fetchConfigFromNetwork } from './fetch-config-from-network';
import { ConfigError, ConfigErrorCode } from './remote-config-error';
import type { ConfigIdentity, RemoteConfigDeps } from './remote-config-types';

export async function forceFetchConfig<T>(
  deps: RemoteConfigDeps,
  identity: ConfigIdentity<T>,
): Promise<T> {
  try {
    const result = await fetchConfigFromNetwork(deps, identity, 0);
    if (result !== null) return result;
  } catch (error) {
    throw new ConfigError(
      ConfigErrorCode.CONFIG_FETCH_FAILED,
      `Force fetch failed for config "${identity.configName}"`,
      error,
    );
  }

  throw new ConfigError(
    ConfigErrorCode.CONFIG_NOT_FOUND,
    `Config "${identity.configName}" not found in cache or server`,
  );
}
