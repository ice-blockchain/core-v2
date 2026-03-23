import type { IKeyValueStorage } from "../types";

interface KeyValueStorageOptions {
  id: string;
}

function prefixKey(id: string, key: string): string {
  return `@ion/${id}/${key}`;
}

export function createKeyValueStorage(
  options: KeyValueStorageOptions,
): IKeyValueStorage {
  const { id } = options;

  return {
    getString(key: string): string | null {
      return localStorage.getItem(prefixKey(id, key));
    },

    setString(key: string, value: string): void {
      localStorage.setItem(prefixKey(id, key), value);
    },

    getNumber(key: string): number | null {
      const raw = localStorage.getItem(prefixKey(id, key));
      if (raw === null) return null;
      return Number(raw);
    },

    setNumber(key: string, value: number): void {
      localStorage.setItem(prefixKey(id, key), String(value));
    },

    getBoolean(key: string): boolean | null {
      const raw = localStorage.getItem(prefixKey(id, key));
      if (raw === null) return null;
      return raw === "true";
    },

    setBoolean(key: string, value: boolean): void {
      localStorage.setItem(prefixKey(id, key), String(value));
    },

    getObject<T>(key: string): T | null {
      const raw = localStorage.getItem(prefixKey(id, key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    },

    setObject<T>(key: string, value: T): void {
      localStorage.setItem(prefixKey(id, key), JSON.stringify(value));
    },

    removeItem(key: string): void {
      localStorage.removeItem(prefixKey(id, key));
    },

    hasItem(key: string): boolean {
      return localStorage.getItem(prefixKey(id, key)) !== null;
    },

    clear(): void {
      const prefix = `@ion/${id}/`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey?.startsWith(prefix)) {
          keysToRemove.push(storageKey);
        }
      }
      for (const storageKey of keysToRemove) {
        localStorage.removeItem(storageKey);
      }
    },
  };
}
