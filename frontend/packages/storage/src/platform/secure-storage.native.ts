import * as ExpoSecureStore from "expo-secure-store";
import type { ISecureStorage } from "../types";

const KEY_REGISTRY = "__secure_storage_keys__";

export function createSecureStorage(): ISecureStorage {
  async function getKeyRegistry(): Promise<string[]> {
    const raw = await ExpoSecureStore.getItemAsync(KEY_REGISTRY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  }

  async function addToRegistry(key: string): Promise<void> {
    const keys = await getKeyRegistry();
    if (keys.includes(key)) return;
    keys.push(key);
    await ExpoSecureStore.setItemAsync(KEY_REGISTRY, JSON.stringify(keys));
  }

  async function removeFromRegistry(key: string): Promise<void> {
    const keys = await getKeyRegistry();
    const filtered = keys.filter((k) => k !== key);
    await ExpoSecureStore.setItemAsync(KEY_REGISTRY, JSON.stringify(filtered));
  }

  return {
    async getItem(key: string): Promise<string | null> {
      return ExpoSecureStore.getItemAsync(key);
    },

    async setItem(key: string, value: string): Promise<void> {
      await ExpoSecureStore.setItemAsync(key, value);
      await addToRegistry(key);
    },

    async removeItem(key: string): Promise<void> {
      await ExpoSecureStore.deleteItemAsync(key);
      await removeFromRegistry(key);
    },

    async hasItem(key: string): Promise<boolean> {
      const value = await ExpoSecureStore.getItemAsync(key);
      return value !== null;
    },

    async clear(): Promise<void> {
      const keys = await getKeyRegistry();
      for (const key of keys) {
        await ExpoSecureStore.deleteItemAsync(key);
      }
      await ExpoSecureStore.deleteItemAsync(KEY_REGISTRY);
    },
  };
}
