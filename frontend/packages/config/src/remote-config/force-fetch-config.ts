import { fetchConfigFromNetwork } from './fetch-config-from-network';
import { ConfigError, ConfigErrorCode } from './remote-config-error';
import type { GetConfigOptions, RemoteConfigDeps } from './remote-config-types';

export async function forceFetchConfig<T>(
  deps: RemoteConfigDeps,
  options: GetConfigOptions<T>,
): Promise<T> {
  try {
    const result = await fetchConfigFromNetwork(deps, options, 0);
    if (result !== null) return result;
  } catch (error) {
    throw new ConfigError(
      ConfigErrorCode.CONFIG_FETCH_FAILED,
      `Force fetch failed for config "${options.configName}"`,
      error,
    );
  }

  throw new ConfigError(
    ConfigErrorCode.CONFIG_NOT_FOUND,
    `Config "${options.configName}" not found in cache or server`,
  );
}
