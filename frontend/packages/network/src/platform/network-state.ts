import type { NetworkStateProvider } from '../event-types';

export function createNetworkStateProvider(): NetworkStateProvider {
  throw new Error('Platform implementation not resolved. Use .native.ts or .web.ts');
}
