import type { ISecureStorage } from "../types";

interface KeychainBackend {
  getGenericPassword(options: { service: string }): Promise<false | { password: string }>;
  setGenericPassword(username: string, password: string, options: { service: string }): Promise<boolean>;
  resetGenericPassword(options: { service: string }): Promise<boolean>;
}

function loadKeychainBackend(): KeychainBackend {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  return require("react-native-keychain") as KeychainBackend;
}

const SERVICE_PREFIX = "ion.secure.";
const KEY_REGISTRY_SERVICE = "ion.secure.__keys__";

async function getKeyRegistry(keychain: KeychainBackend): Promise<string[]> {
  const result = await keychain.getGenericPassword({ service: KEY_REGISTRY_SERVICE });
  if (!result) return [];
  return JSON.parse(result.password) as string[];
}

async function saveKeyRegistry(keychain: KeychainBackend, keys: string[]): Promise<void> {
  await keychain.setGenericPassword("registry", JSON.stringify(keys), { service: KEY_REGISTRY_SERVICE });
}

export function createSecureStorage(): ISecureStorage {
  const keychain = loadKeychainBackend();
  return {
    async getItem(key: string): Promise<string | null> {
      const result = await keychain.getGenericPassword({ service: SERVICE_PREFIX + key });
      return result ? result.password : null;
    },

    async setItem(key: string, value: string): Promise<void> {
      await keychain.setGenericPassword(key, value, { service: SERVICE_PREFIX + key });
      const keys = await getKeyRegistry(keychain);
      if (!keys.includes(key)) {
        keys.push(key);
        await saveKeyRegistry(keychain, keys);
      }
    },

    async removeItem(key: string): Promise<void> {
      await keychain.resetGenericPassword({ service: SERVICE_PREFIX + key });
      const keys = await getKeyRegistry(keychain);
      const filtered = keys.filter((k) => k !== key);
      await saveKeyRegistry(keychain, filtered);
    },

    async hasItem(key: string): Promise<boolean> {
      const result = await keychain.getGenericPassword({ service: SERVICE_PREFIX + key });
      return result !== false;
    },

    async clear(): Promise<void> {
      const keys = await getKeyRegistry(keychain);
      for (const key of keys) {
        await keychain.resetGenericPassword({ service: SERVICE_PREFIX + key });
      }
      await keychain.resetGenericPassword({ service: KEY_REGISTRY_SERVICE });
    },
  };
}
