import type * as ExpoSecureStoreType from "expo-secure-store";
import type { ISecureStorage } from "../types";

type SecureStoreModule = typeof ExpoSecureStoreType;

function getSecureStore(): SecureStoreModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  return require("expo-secure-store") as SecureStoreModule;
}

const KEY_REGISTRY = "__secure_storage_keys__";

async function getKeyRegistry(): Promise<string[]> {
  const raw = await getSecureStore().getItemAsync(KEY_REGISTRY);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

async function addToRegistry(key: string): Promise<void> {
  const keys = await getKeyRegistry();
  if (keys.includes(key)) return;
  keys.push(key);
  await getSecureStore().setItemAsync(KEY_REGISTRY, JSON.stringify(keys));
}

async function removeFromRegistry(key: string): Promise<void> {
  const keys = await getKeyRegistry();
  const filtered = keys.filter((k) => k !== key);
  await getSecureStore().setItemAsync(KEY_REGISTRY, JSON.stringify(filtered));
}

export function createSecureStorage(): ISecureStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      return getSecureStore().getItemAsync(key);
    },

    async setItem(key: string, value: string): Promise<void> {
      await getSecureStore().setItemAsync(key, value);
      await addToRegistry(key);
    },

    async removeItem(key: string): Promise<void> {
      await getSecureStore().deleteItemAsync(key);
      await removeFromRegistry(key);
    },

    async hasItem(key: string): Promise<boolean> {
      const value = await getSecureStore().getItemAsync(key);
      return value !== null;
    },

    async clear(): Promise<void> {
      const keys = await getKeyRegistry();
      for (const key of keys) {
        await getSecureStore().deleteItemAsync(key);
      }
      await getSecureStore().deleteItemAsync(KEY_REGISTRY);
    },
  };
}
