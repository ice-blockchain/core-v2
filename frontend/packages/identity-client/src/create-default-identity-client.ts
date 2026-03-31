import { environmentConfig } from '@ion/config';
import { createHttpClient } from '@ion/network';
import type { ISecureStorage } from '@ion/storage';
import type { IdentityClient, IdentityClientConfig } from './types';
import { createIdentityClient } from './create-identity-client';

interface DefaultIdentityClientConfig {
  secureStorage: ISecureStorage;
  httpClient?: IdentityClientConfig['httpClient'];
  appId?: string;
}

export function createDefaultIdentityClient(config: DefaultIdentityClientConfig): IdentityClient {
  const httpClient = config.httpClient ?? createHttpClient({ baseUrl: environmentConfig.apiBaseUrl });
  const appId = config.appId ?? environmentConfig.identityAppId;
  return createIdentityClient({ httpClient, secureStorage: config.secureStorage, appId });
}
