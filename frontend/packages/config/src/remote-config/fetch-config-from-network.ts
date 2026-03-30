import { writeToCache } from './config-cache';
import { ConfigError, ConfigErrorCode } from './remote-config-error';
import type {
  AppConfigWithVersion,
  GetConfigOptions,
  RemoteConfigDeps,
} from './remote-config-types';

export async function fetchConfigFromNetwork<T>(
  deps: RemoteConfigDeps,
  options: GetConfigOptions<T>,
  version: number,
): Promise<T | null> {
  const query = buildQuery(options.checkVersion, version);
  const url = `/v1/config/${options.configName}`;

  const response = await deps.httpClient.getRaw(url, { query });

  if (response.status === 204) return null;
  if (response.status !== 200) {
    throw new ConfigError(
      ConfigErrorCode.CONFIG_FETCH_FAILED,
      `Unexpected status ${response.status} for config "${options.configName}"`,
    );
  }

  const parsed = options.parser(response.body);
  const resolvedVersion = resolveVersion(parsed, response.headers, options.checkVersion);
  const entry = { raw: response.body, version: resolvedVersion, fetchedAtMs: Date.now() };
  writeToCache(deps, options.configName, entry);

  return parsed;
}

function buildQuery(
  checkVersion: boolean | undefined,
  version: number,
): Record<string, string> | undefined {
  if (!checkVersion) return undefined;
  return { version: String(version) };
}

function resolveVersion<T>(
  parsed: T,
  headers: Record<string, string>,
  checkVersion: boolean | undefined,
): number {
  if (!checkVersion) return 0;

  const asVersioned = parsed as Partial<AppConfigWithVersion>;
  if (typeof asVersioned.version === 'number') return asVersioned.version;

  const headerVersion = parseInt(headers['x-version'] ?? '', 10);
  if (!isNaN(headerVersion)) return headerVersion;

  throw new ConfigError(
    ConfigErrorCode.CONFIG_VERSION_MISSING,
    'checkVersion is true but no version found in response or x-version header',
  );
}
