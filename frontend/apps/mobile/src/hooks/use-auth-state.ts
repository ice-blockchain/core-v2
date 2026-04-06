import { useSyncExternalStore } from 'react';
import { identityClient } from '../identity-client';

export function useAuthState(): readonly string[] {
  return useSyncExternalStore(
    identityClient.authStore.subscribe,
    identityClient.authStore.getSnapshot,
  );
}
