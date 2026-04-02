import type { EncryptedPrivateKey } from './encrypt-private-key';

export function isValidEncryptedPrivateKey(value: unknown): value is EncryptedPrivateKey {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.salt === 'string' && obj.salt.trim().length > 0 &&
    typeof obj.nonce === 'string' && obj.nonce.trim().length > 0 &&
    typeof obj.ciphertext === 'string' && obj.ciphertext.trim().length > 0 &&
    typeof obj.mac === 'string' && obj.mac.trim().length > 0
  );
}
