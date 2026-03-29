import { environmentConfig } from '@ion/config';
import { createHttpClient } from '@ion/network';
import { createIdentityClient } from '@ion/identity-client';
import type { IdentityClient, IdentityClientConfig } from '@ion/identity-client';

const httpClient = createHttpClient({ baseUrl: environmentConfig.identityApiUrl });

// In-memory secure storage for testing.
// Replace with createSecureStorage() from @ion/storage once
// expo-secure-store (or react-native-keychain) is installed.
const store = new Map<string, string>();
const memorySecureStorage: IdentityClientConfig['secureStorage'] = {
  getItem: async (key: string) => store.get(key) ?? null,
  setItem: async (key: string, value: string) => { store.set(key, value); },
  removeItem: async (key: string) => { store.delete(key); },
  hasItem: async (key: string) => store.has(key),
  clear: async () => { store.clear(); },
};

export const identityClient: IdentityClient = createIdentityClient({
  httpClient,
  secureStorage: memorySecureStorage,
  appId: environmentConfig.identityAppId,
});
