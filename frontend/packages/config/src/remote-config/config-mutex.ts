export interface ConfigMutex {
  run<T>(key: string, factory: () => Promise<T>): Promise<T>;
  clear(): void;
}

export function createConfigMutex(): ConfigMutex {
  const pending = new Map<string, Promise<unknown>>();

  return {
    run<T>(key: string, factory: () => Promise<T>): Promise<T> {
      const existing = pending.get(key);
      if (existing) return existing as Promise<T>;

      const promise = factory().finally(() => pending.delete(key));
      pending.set(key, promise);
      return promise;
    },

    clear() {
      pending.clear();
    },
  };
}
