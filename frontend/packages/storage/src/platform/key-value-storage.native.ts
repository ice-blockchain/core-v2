import { MMKV } from "react-native-mmkv";
import type { IKeyValueStorage } from "../types";

interface KeyValueStorageOptions {
  id: string;
  encryptionKey?: string;
}

export function createKeyValueStorage(
  options: KeyValueStorageOptions,
): IKeyValueStorage {
  const mmkv = new MMKV({
    id: options.id,
    encryptionKey: options.encryptionKey,
  });

  return {
    getString(key: string): string | null {
      return mmkv.getString(key) ?? null;
    },

    setString(key: string, value: string): void {
      mmkv.set(key, value);
    },

    getNumber(key: string): number | null {
      return mmkv.getNumber(key) ?? null;
    },

    setNumber(key: string, value: number): void {
      mmkv.set(key, value);
    },

    getBoolean(key: string): boolean | null {
      const value = mmkv.getBoolean(key);
      return value === undefined ? null : value;
    },

    setBoolean(key: string, value: boolean): void {
      mmkv.set(key, value);
    },

    getObject<T>(key: string): T | null {
      const raw = mmkv.getString(key);
      if (raw === undefined) return null;
      return JSON.parse(raw) as T;
    },

    setObject<T>(key: string, value: T): void {
      mmkv.set(key, JSON.stringify(value));
    },

    removeItem(key: string): void {
      mmkv.delete(key);
    },

    hasItem(key: string): boolean {
      return mmkv.contains(key);
    },

    clear(): void {
      mmkv.clearAll();
    },
  };
}
