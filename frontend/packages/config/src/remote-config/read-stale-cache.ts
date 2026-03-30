import { Logger } from '@ion/diagnostics';

import { readFromStorage } from './config-cache';
import type { ConfigIdentity, RemoteConfigDeps } from './remote-config-types';

export function readStaleCache<T>(
  deps: RemoteConfigDeps,
  identity: ConfigIdentity<T>,
): T | null {
  const entry = readFromStorage(deps.storage, identity.configName);
  if (!entry) return null;

  try {
    return identity.parser(entry.raw);
  } catch (error) {
    Logger.warning('Failed to parse stale config', { tag: 'remote-config', data: { configName: identity.configName, error } });
    return null;
  }
}
