import { ed25519, x25519 } from '@noble/curves/ed25519';
import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { scrypt } from '@noble/hashes/scrypt';
import type { PulseKeyPair, PulseEncryptedData } from './types';

const SCRYPT_OPTIONS = { N: 2 ** 14, r: 8, p: 1, dkLen: 32 } as const;
const GCM_NONCE_LENGTH = 12;

export function generatePulseKeyPair(): PulseKeyPair {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

export function pulseSign(data: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed25519.sign(data, privateKey);
}

interface PulseVerifyOptions {
  readonly data: Uint8Array;
  readonly signature: Uint8Array;
  readonly publicKey: Uint8Array;
}

export function pulseVerify(options: PulseVerifyOptions): boolean {
  return ed25519.verify(options.signature, options.data, options.publicKey);
}

interface PulseEncryptOptions {
  readonly data: Uint8Array;
  readonly key: Uint8Array;
}

export function pulseEncrypt(options: PulseEncryptOptions): PulseEncryptedData {
  const nonce = randomBytes(GCM_NONCE_LENGTH);
  const cipher = gcm(options.key, nonce);
  const ciphertext = cipher.encrypt(options.data);
  return { ciphertext, nonce };
}

interface PulseDecryptOptions {
  readonly encrypted: PulseEncryptedData;
  readonly key: Uint8Array;
}

export function pulseDecrypt(options: PulseDecryptOptions): Uint8Array {
  const cipher = gcm(options.key, options.encrypted.nonce);
  return cipher.decrypt(options.encrypted.ciphertext);
}

interface PulseSharedSecretOptions {
  readonly theirPublicKey: Uint8Array;
  readonly myPrivateKey: Uint8Array;
}

export function pulseSharedSecret(options: PulseSharedSecretOptions): Uint8Array {
  return x25519.getSharedSecret(options.myPrivateKey, options.theirPublicKey);
}

interface PulseStretchPasswordOptions {
  readonly password: string;
  readonly salt: Uint8Array;
}

export function pulseStretchPassword(options: PulseStretchPasswordOptions): Uint8Array {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(options.password);
  return scrypt(passwordBytes, options.salt, SCRYPT_OPTIONS);
}
