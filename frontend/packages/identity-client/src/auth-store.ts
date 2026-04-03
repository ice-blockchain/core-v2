import type { AuthStore } from './types';

export interface InternalAuthStore extends AuthStore {
  addUser(username: string): void;
  removeUser(username: string): void;
}

export function createAuthStore(): InternalAuthStore {
  let snapshot: readonly string[] = [];
  const listeners = new Set<() => void>();

  function emit(): void {
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => { listeners.delete(onStoreChange); };
    },
    addUser(username) {
      if (snapshot.includes(username)) return;
      snapshot = [...snapshot, username];
      emit();
    },
    removeUser(username) {
      if (!snapshot.includes(username)) return;
      snapshot = snapshot.filter((u) => u !== username);
      emit();
    },
  };
}
