import { environmentConfig } from '@ion/config';
import { createHttpClient } from '@ion/network';
import { createSecureStorage } from '@ion/storage';
import { createIdentityClient } from '@ion/identity-client';
import type { IdentityClient } from '@ion/identity-client';

const httpClient = createHttpClient({ baseUrl: environmentConfig.apiBaseUrl });
const secureStorage = createSecureStorage();

export const identityClient: IdentityClient = createIdentityClient({
  httpClient,
  secureStorage,
  appId: environmentConfig.identityAppId,
});
