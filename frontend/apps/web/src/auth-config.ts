import { createHttpClient } from '@ion/network';
import { createSecureStorage } from '@ion/storage';
import { createIdentityClient } from '@ion/identity-client';
import type { IdentityClient } from '@ion/identity-client';

const STAGING_BASE_URL = 'https://staging.api.identity.io';
const STAGING_APP_ID = 'ap-4b208e64-063c-48a2-a431-96536006c459';

const httpClient = createHttpClient({ baseUrl: STAGING_BASE_URL });
const secureStorage = createSecureStorage('ion-web-dev-key');

export const identityClient: IdentityClient = createIdentityClient({
  httpClient,
  secureStorage,
  appId: STAGING_APP_ID,
});
