import type { IKeyValueStorage } from "../types";

interface KeyValueStorageOptions {
  id: string;
  encryptionKey?: string;
}

interface KeyValueBackend {
  getString(key: string): string | undefined;
  set(key: string, value: string | number | boolean): void;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
  remove(key: string): boolean;
  contains(key: string): boolean;
  clearAll(): void;
}

const fallbackStores = new Map<string, Map<string, string | number | boolean>>();

function getFallbackStore(id: string): Map<string, string | number | boolean> {
  let store = fallbackStores.get(id);
  if (!store) {
    store = new Map<string, string | number | boolean>();
    fallbackStores.set(id, store);
  }
  return store;
}

function createFallbackBackend(id: string): KeyValueBackend {
  const store = getFallbackStore(id);
  return {
    getString(key: string): string | undefined {
      const value = store.get(key);
      return typeof value === "string" ? value : undefined;
    },
    set(key: string, value: string | number | boolean): void {
      store.set(key, value);
    },
    getNumber(key: string): number | undefined {
      const value = store.get(key);
      return typeof value === "number" ? value : undefined;
    },
    getBoolean(key: string): boolean | undefined {
      const value = store.get(key);
      return typeof value === "boolean" ? value : undefined;
    },
    remove(key: string): boolean {
      return store.delete(key);
    },
    contains(key: string): boolean {
      return store.has(key);
    },
    clearAll(): void {
      store.clear();
    },
  };
}

function createBackend(options: KeyValueStorageOptions): KeyValueBackend {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require("react-native-mmkv") as { createMMKV: (config: Record<string, unknown>) => KeyValueBackend };
    return createMMKV({ id: options.id, ...(options.encryptionKey ? { encryptionKey: options.encryptionKey } : {}) });
  } catch {
    // fall through to in-memory fallback
  }
  return createFallbackBackend(options.id);
}

function buildPrimitiveMethods(backend: KeyValueBackend): Pick<
  IKeyValueStorage,
  "getString" | "setString" | "getNumber" | "setNumber" | "getBoolean" | "setBoolean"
> {
  return {
    getString(key: string): string | null {
      return backend.getString(key) ?? null;
    },
    setString(key: string, value: string): void {
      backend.set(key, value);
    },
    getNumber(key: string): number | null {
      return backend.getNumber(key) ?? null;
    },
    setNumber(key: string, value: number): void {
      backend.set(key, value);
    },
    getBoolean(key: string): boolean | null {
      const value = backend.getBoolean(key);
      return value === undefined ? null : value;
    },
    setBoolean(key: string, value: boolean): void {
      backend.set(key, value);
    },
  };
}

function buildObjectAndUtilMethods(backend: KeyValueBackend): Pick<
  IKeyValueStorage,
  "getObject" | "setObject" | "removeItem" | "hasItem" | "clear"
> {
  return {
    getObject<T>(key: string): T | null {
      const raw = backend.getString(key);
      if (raw === undefined) return null;
      return JSON.parse(raw) as T;
    },
    setObject<T>(key: string, value: T): void {
      backend.set(key, JSON.stringify(value));
    },
    removeItem(key: string): void {
      backend.remove(key);
    },
    hasItem(key: string): boolean {
      return backend.contains(key);
    },
    clear(): void {
      backend.clearAll();
    },
  };
}

export function createKeyValueStorage(
  options: KeyValueStorageOptions,
): IKeyValueStorage {
  const backend = createBackend(options);
  return {
    ...buildPrimitiveMethods(backend),
    ...buildObjectAndUtilMethods(backend),
  };
}
