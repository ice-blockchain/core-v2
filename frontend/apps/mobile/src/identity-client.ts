import { createDefaultIdentityClient } from '@ion/identity-client';
import { createSecureStorage } from '@ion/storage';

export const identityClient = createDefaultIdentityClient({
  secureStorage: createSecureStorage('identity-client'),
});
