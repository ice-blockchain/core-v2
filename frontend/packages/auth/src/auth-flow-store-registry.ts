import type { AuthFlowStore } from './auth-flow-store-types';

let globalStore: AuthFlowStore | null = null;

export function setAuthFlowStore(store: AuthFlowStore): void {
  if (globalStore && globalStore !== store) {
    throw new Error('AuthFlowStore already initialized.');
  }
  globalStore = store;
}

export function getAuthFlowStore(): AuthFlowStore {
  if (!globalStore) {
    throw new Error('AuthFlowStore not initialized. Call setAuthFlowStore() in your app entry point.');
  }
  return globalStore;
}
