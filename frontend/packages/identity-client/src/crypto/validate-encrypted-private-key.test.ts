import { describe, it, expect } from 'vitest';
import { isValidEncryptedPrivateKey } from './validate-encrypted-private-key';

describe('isValidEncryptedPrivateKey', () => {
  it('returns true for valid encrypted key', () => {
    expect(isValidEncryptedPrivateKey({ salt: 's', nonce: 'n', ciphertext: 'c', mac: 'm' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidEncryptedPrivateKey(null)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isValidEncryptedPrivateKey('string')).toBe(false);
  });

  it('returns false when salt is missing', () => {
    expect(isValidEncryptedPrivateKey({ nonce: 'n', ciphertext: 'c', mac: 'm' })).toBe(false);
  });

  it('returns false when a field is empty string', () => {
    expect(isValidEncryptedPrivateKey({ salt: '', nonce: 'n', ciphertext: 'c', mac: 'm' })).toBe(false);
  });

  it('returns false when a field is not a string', () => {
    expect(isValidEncryptedPrivateKey({ salt: 123, nonce: 'n', ciphertext: 'c', mac: 'm' })).toBe(false);
  });

  it('returns false for arrays', () => {
    expect(isValidEncryptedPrivateKey([])).toBe(false);
    expect(isValidEncryptedPrivateKey([{ salt: 's', nonce: 'n', ciphertext: 'c', mac: 'm' }])).toBe(false);
  });

  it('returns false when a field is whitespace only', () => {
    expect(isValidEncryptedPrivateKey({ salt: '  ', nonce: 'n', ciphertext: 'c', mac: 'm' })).toBe(false);
  });
});
