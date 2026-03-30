import { readFromStorage } from './config-cache';
import type { GetConfigOptions, RemoteConfigDeps } from './remote-config-types';

export function readStaleCache<T>(
  deps: RemoteConfigDeps,
  options: GetConfigOptions<T>,
): T | null {
  const entry = readFromStorage(deps.storage, options.configName);
  if (!entry) return null;

  try {
    return options.parser(entry.raw);
  } catch {
    return null;
  }
}
