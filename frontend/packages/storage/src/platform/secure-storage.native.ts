import type { ISecureStorage } from "../types";

interface KeychainOptions {
  service: string;
  accessible?: number;
}

interface KeychainAccessible {
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: number;
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: number;
}

interface KeychainBackend {
  ACCESSIBLE: KeychainAccessible;
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

interface FallbackWriteOptions {
  keychain: KeychainBackend;
  username: string;
  password: string;
  service: string;
}

async function setWithAccessibilityFallback(options: FallbackWriteOptions): Promise<void> {
  const { keychain, username, password, service } = options;
  try {
    await keychain.setGenericPassword(username, password, {
      service,
      accessible: keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(
      `[SecureStorage] setGenericPassword failed for service "${service}" ` +
      `with WHEN_PASSCODE_SET_THIS_DEVICE_ONLY (device may lack passcode): ${detail}. ` +
      'Retrying with WHEN_UNLOCKED_THIS_DEVICE_ONLY.',
    );
    await keychain.setGenericPassword(username, password, {
      service,
      accessible: keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
}

async function saveKeyRegistry(keychain: KeychainBackend, keys: string[]): Promise<void> {
  await setWithAccessibilityFallback({
    keychain, username: "registry", password: JSON.stringify(keys), service: KEY_REGISTRY_SERVICE,
  });
}

function serviceFor(key: string): string {
  return SERVICE_PREFIX + key;
}

async function setSecureItem(keychain: KeychainBackend, key: string, value: string): Promise<void> {
  await setWithAccessibilityFallback({ keychain, username: key, password: value, service: serviceFor(key) });
  const keys = await getKeyRegistry(keychain);
  if (!keys.includes(key)) {
    keys.push(key);
    try {
      await saveKeyRegistry(keychain, keys);
    } catch (registryError) {
      await keychain.resetGenericPassword({ service: serviceFor(key) });
      throw registryError;
    }
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
