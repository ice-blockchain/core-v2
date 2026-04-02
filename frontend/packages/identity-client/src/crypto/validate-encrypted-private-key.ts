import type { EncryptedPrivateKey } from './encrypt-private-key';

export function isValidEncryptedPrivateKey(value: unknown): value is EncryptedPrivateKey {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.salt === 'string' && obj.salt.length > 0 &&
    typeof obj.nonce === 'string' && obj.nonce.length > 0 &&
    typeof obj.ciphertext === 'string' && obj.ciphertext.length > 0 &&
    typeof obj.mac === 'string' && obj.mac.length > 0
  );
}
