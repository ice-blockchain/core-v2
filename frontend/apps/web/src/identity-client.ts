import { createSecureStorage } from '@ion/storage';
import { createDefaultIdentityClient } from '@ion/identity-client';

export const identityClient = createDefaultIdentityClient({
  secureStorage: createSecureStorage('identity-client'),
});
