import { sha256 } from '@noble/hashes/sha256';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { randomBytes, concatBytes, utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils';
import { gcm } from '@noble/ciphers/aes';
import { base64 } from '@scure/base';
import { PBKDF2_ITERATIONS } from '@ion/storage';

export interface EncryptedPrivateKey {
  salt: string;
  nonce: string;
  ciphertext: string;
  mac: string;
}

export type Pbkdf2Fn = (password: string, salt: Uint8Array, iterations: number, keyLength: number, hash: string) => Uint8Array;

interface DeriveKeyInput {
  password: string;
  salt: Uint8Array;
  iterations: number;
  pbkdf2Fn?: Pbkdf2Fn;
}

async function deriveKey(input: DeriveKeyInput): Promise<Uint8Array> {
  if (input.pbkdf2Fn) {
    const buf: ArrayBufferView = input.pbkdf2Fn(input.password, new Uint8Array(input.salt), input.iterations, 32, 'sha256');
    return new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  }
  return pbkdf2Async(sha256, input.password, input.salt, { c: input.iterations, dkLen: 32 });
}

export async function encryptPrivateKey(
  privateKeyPem: string,
  password: string,
  pbkdf2Fn?: Pbkdf2Fn,
): Promise<EncryptedPrivateKey> {
  const salt = randomBytes(16);
  const key = await deriveKey({ password, salt, iterations: PBKDF2_ITERATIONS, ...(pbkdf2Fn && { pbkdf2Fn }) });
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
  pbkdf2Fn?: Pbkdf2Fn,
): Promise<string> {
  const salt = base64.decode(encrypted.salt);
  const key = await deriveKey({ password, salt, iterations: PBKDF2_ITERATIONS, ...(pbkdf2Fn && { pbkdf2Fn }) });
  const nonce = base64.decode(encrypted.nonce);
  const combined = concatBytes(base64.decode(encrypted.ciphertext), base64.decode(encrypted.mac));
  const decrypted = gcm(key, nonce).decrypt(combined);
  return bytesToUtf8(decrypted);
}
