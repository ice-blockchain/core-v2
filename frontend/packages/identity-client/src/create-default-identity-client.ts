import { environmentConfig } from '@ion/config';
import type { ISecureStorage } from '@ion/storage';
import type { IdentityClient } from './types';
import { createIdentityClient } from './create-identity-client';

interface DefaultIdentityClientConfig {
  secureStorage: ISecureStorage;
  baseUrl?: string;
  appId?: string;
}

export function createDefaultIdentityClient(config: DefaultIdentityClientConfig): IdentityClient {
  return createIdentityClient({
    secureStorage: config.secureStorage,
    baseUrl: config.baseUrl ?? environmentConfig.apiBaseUrl,
    appId: config.appId ?? environmentConfig.identityAppId,
  });
}
