import { sha256 } from '@noble/hashes/sha256';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { randomBytes, concatBytes, utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils';
import { gcm } from '@noble/ciphers/aes';
import { base64 } from '@scure/base';

export interface EncryptedPrivateKey {
  salt: string;
  nonce: string;
  ciphertext: string;
  mac: string;
}

const PBKDF2_ITERATIONS = 100_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = typeof globalThis !== 'undefined' ? (globalThis as any) : ({} as any);

function isNativePlatform(): boolean {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

function hasNativePbkdf2(): boolean {
  return isNativePlatform() && typeof g.__nativePbkdf2Sync === 'function';
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  if (hasNativePbkdf2()) {
    const buf = g.__nativePbkdf2Sync(password, new Uint8Array(salt), iterations, 32, 'sha256');
    return buf instanceof Uint8Array ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  return pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: 32 });
}

export async function encryptPrivateKey(
  privateKeyPem: string,
  password: string,
): Promise<EncryptedPrivateKey> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const nonce = randomBytes(12);
  const encrypted = gcm(key, nonce).encrypt(utf8ToBytes(privateKeyPem));
  return {
    salt: base64.encode(salt),
    nonce: base64.encode(nonce),
    ciphertext: base64.encode(encrypted.slice(0, -16)),
    mac: base64.encode(encrypted.slice(-16)),
  };
}

export async function decryptPrivateKey(
  encrypted: EncryptedPrivateKey,
  password: string,
): Promise<string> {
  const salt = base64.decode(encrypted.salt);
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  const nonce = base64.decode(encrypted.nonce);
  const combined = concatBytes(base64.decode(encrypted.ciphertext), base64.decode(encrypted.mac));
  const decrypted = gcm(key, nonce).decrypt(combined);
  return bytesToUtf8(decrypted);
}
