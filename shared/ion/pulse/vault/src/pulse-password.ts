import { scrypt } from '@noble/hashes/scrypt';
import { randomBytes } from '@noble/hashes/utils';

const SCRYPT_N = 2 ** 14;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 32;

export function pulseStretchPassword(password: string, salt: Uint8Array): Uint8Array {
  return scrypt(password, salt, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, dkLen: KEY_LENGTH });
}

export function generatePulseSalt(): Uint8Array {
  return randomBytes(SALT_LENGTH);
}
