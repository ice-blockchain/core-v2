import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/webcrypto';
import type { PulseEncrypted } from './types.js';

const NONCE_LENGTH = 12;

interface PulseDecryptOptions {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  key: Uint8Array;
}

export function pulseEncrypt(data: Uint8Array, key: Uint8Array): PulseEncrypted {
  const nonce = randomBytes(NONCE_LENGTH);
  const aes = gcm(key, nonce);
  const ciphertext = aes.encrypt(data);
  return { ciphertext, nonce };
}

export function pulseDecrypt(options: PulseDecryptOptions): Uint8Array {
  const aes = gcm(options.key, options.nonce);
  return aes.decrypt(options.ciphertext);
}
