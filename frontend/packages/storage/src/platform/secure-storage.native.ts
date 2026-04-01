import type * as KeychainType from "react-native-keychain";
import type { ISecureStorage } from "../types";

type KeychainModule = typeof KeychainType;

const SERVICE_PREFIX = "ion.secure-storage.";
const REGISTRY_SERVICE = "ion.secure-storage.__registry__";
const REGISTRY_ACCOUNT = "key-registry";

let cachedKeychain: KeychainModule | null = null;

function getKeychain(): KeychainModule {
  if (cachedKeychain) return cachedKeychain;
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  cachedKeychain = require("react-native-keychain") as KeychainModule;
  return cachedKeychain;
}

async function getKeyRegistry(): Promise<string[]> {
  const Keychain = getKeychain();
  const result = await Keychain.getGenericPassword({
    service: REGISTRY_SERVICE,
  });
  if (!result) return [];
  const parsed: unknown = JSON.parse(result.password);
  if (!Array.isArray(parsed)) return [];
  return parsed as string[];
}

async function saveKeyRegistry(keys: string[]): Promise<void> {
  const Keychain = getKeychain();
  await Keychain.setGenericPassword(
    REGISTRY_ACCOUNT,
    JSON.stringify(keys),
    { service: REGISTRY_SERVICE },
  );
}

async function addToRegistry(key: string): Promise<void> {
  const keys = await getKeyRegistry();
  if (keys.includes(key)) return;
  keys.push(key);
  await saveKeyRegistry(keys);
}

async function removeFromRegistry(key: string): Promise<void> {
  const keys = await getKeyRegistry();
  const filtered = keys.filter((k) => k !== key);
  await saveKeyRegistry(filtered);
}

export function createSecureStorage(): ISecureStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      const Keychain = getKeychain();
      const result = await Keychain.getGenericPassword({
        service: SERVICE_PREFIX + key,
      });
      if (!result) return null;
      return result.password;
    },

    async setItem(key: string, value: string): Promise<void> {
      const Keychain = getKeychain();
      await Keychain.setGenericPassword(key, value, {
        service: SERVICE_PREFIX + key,
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
      });
      await addToRegistry(key);
    },

    async removeItem(key: string): Promise<void> {
      const Keychain = getKeychain();
      await Keychain.resetGenericPassword({
        service: SERVICE_PREFIX + key,
      });
      await removeFromRegistry(key);
    },

    async hasItem(key: string): Promise<boolean> {
      const Keychain = getKeychain();
      const result = await Keychain.getGenericPassword({
        service: SERVICE_PREFIX + key,
      });
      return result !== false;
    },

    async clear(): Promise<void> {
      const Keychain = getKeychain();
      const keys = await getKeyRegistry();
      for (const key of keys) {
        await Keychain.resetGenericPassword({
          service: SERVICE_PREFIX + key,
        });
      }
      await Keychain.resetGenericPassword({ service: REGISTRY_SERVICE });
    },
  };
}
