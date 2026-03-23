import type { ISecureStorage } from "../types";

const STORAGE_PREFIX = "@ion/secure/";
const KEY_REGISTRY = "@ion/secure/__keys__";
const SALT_KEY = "@ion/secure/__salt__";
const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100_000;

function encode(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

function decode(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encrypt(
  plaintext: string,
  encryptionKey: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH)) as Uint8Array<ArrayBuffer>;
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    encryptionKey,
    encode(plaintext),
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decrypt(
  encoded: string,
  encryptionKey: CryptoKey,
): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
  const iv = combined.slice(0, IV_LENGTH) as Uint8Array<ArrayBuffer>;
  const ciphertext = combined.slice(IV_LENGTH) as Uint8Array<ArrayBuffer>;

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    encryptionKey,
    ciphertext,
  );

  return decode(plaintext);
}

function getOrCreateSalt(): Uint8Array<ArrayBuffer> {
  const existing = localStorage.getItem(SALT_KEY);
  if (existing) {
    return Uint8Array.from(atob(existing), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
  }

  const salt = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array<ArrayBuffer>;
  localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)));
  return salt;
}

function getKeyRegistry(): string[] {
  const raw = localStorage.getItem(KEY_REGISTRY);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

function saveKeyRegistry(keys: string[]): void {
  localStorage.setItem(KEY_REGISTRY, JSON.stringify(keys));
}

export function createSecureStorage(password: string): ISecureStorage {
  const salt = getOrCreateSalt();
  let keyPromise: Promise<CryptoKey> | null = null;

  function getKey(): Promise<CryptoKey> {
    if (!keyPromise) {
      keyPromise = deriveKey(password, salt);
    }
    return keyPromise;
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const encrypted = localStorage.getItem(STORAGE_PREFIX + key);
      if (encrypted === null) return null;
      const encryptionKey = await getKey();
      return decrypt(encrypted, encryptionKey);
    },

    async setItem(key: string, value: string): Promise<void> {
      const encryptionKey = await getKey();
      const encrypted = await encrypt(value, encryptionKey);
      localStorage.setItem(STORAGE_PREFIX + key, encrypted);

      const keys = getKeyRegistry();
      if (!keys.includes(key)) {
        keys.push(key);
        saveKeyRegistry(keys);
      }
    },

    async removeItem(key: string): Promise<void> {
      localStorage.removeItem(STORAGE_PREFIX + key);
      const keys = getKeyRegistry().filter((k) => k !== key);
      saveKeyRegistry(keys);
    },

    async hasItem(key: string): Promise<boolean> {
      return localStorage.getItem(STORAGE_PREFIX + key) !== null;
    },

    async clear(): Promise<void> {
      const keys = getKeyRegistry();
      for (const key of keys) {
        localStorage.removeItem(STORAGE_PREFIX + key);
      }
      localStorage.removeItem(KEY_REGISTRY);
      localStorage.removeItem(SALT_KEY);
      keyPromise = null;
    },
  };
}
