import type { ISecureStorage } from "../types";

interface KeychainOptions {
  service: string;
  accessible?: number;
}

interface KeychainBackend {
  ACCESSIBLE: { WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: number };
  getGenericPassword(options: { service: string }): Promise<false | { password: string }>;
  setGenericPassword(username: string, password: string, options: KeychainOptions): Promise<boolean>;
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
  try {
    const parsed: unknown = JSON.parse(result.password);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

async function saveKeyRegistry(keychain: KeychainBackend, keys: string[]): Promise<void> {
  await keychain.setGenericPassword("registry", JSON.stringify(keys), {
    service: KEY_REGISTRY_SERVICE,
    accessible: keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  });
}

function serviceFor(key: string): string {
  return SERVICE_PREFIX + key;
}

async function setSecureItem(keychain: KeychainBackend, key: string, value: string): Promise<void> {
  await keychain.setGenericPassword(key, value, {
    service: serviceFor(key),
    accessible: keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  });
  const keys = await getKeyRegistry(keychain);
  if (!keys.includes(key)) {
    keys.push(key);
    await saveKeyRegistry(keychain, keys);
  }
}

async function removeSecureItem(keychain: KeychainBackend, key: string): Promise<void> {
  await keychain.resetGenericPassword({ service: serviceFor(key) });
  const keys = await getKeyRegistry(keychain);
  const filtered = keys.filter((k) => k !== key);
  await saveKeyRegistry(keychain, filtered);
}

async function clearSecureStorage(keychain: KeychainBackend): Promise<void> {
  const keys = await getKeyRegistry(keychain);
  for (const key of keys) {
    await keychain.resetGenericPassword({ service: serviceFor(key) });
  }
  await keychain.resetGenericPassword({ service: KEY_REGISTRY_SERVICE });
}

function createMutex() {
  let pending = Promise.resolve();
  return (fn: () => Promise<void>): Promise<void> => {
    const run = pending.then(fn, fn);
    pending = run;
    return run;
  };
}

export function createSecureStorage(): ISecureStorage {
  const keychain = loadKeychainBackend();
  const withLock = createMutex();
  return {
    async getItem(key: string): Promise<string | null> {
      const result = await keychain.getGenericPassword({ service: serviceFor(key) });
      return result ? result.password : null;
    },
    setItem: (key: string, value: string) => withLock(() => setSecureItem(keychain, key, value)),
    removeItem: (key: string) => withLock(() => removeSecureItem(keychain, key)),
    async hasItem(key: string): Promise<boolean> {
      const result = await keychain.getGenericPassword({ service: serviceFor(key) });
      return result !== false;
    },
    clear: () => withLock(() => clearSecureStorage(keychain)),
  };
}
