import { useSyncExternalStore } from 'react';
import type { AuthFlowStore } from './auth-flow-store-types';
import type { AuthFlowStoreState } from './auth-flow-store-types';
import { getAuthFlowStore } from './auth-flow-store-registry';

export function useAuthFlowStore(store: AuthFlowStore): AuthFlowStoreState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function useGlobalAuthFlowStore(): { store: AuthFlowStore; state: AuthFlowStoreState } {
  const store = getAuthFlowStore();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { store, state };
}
