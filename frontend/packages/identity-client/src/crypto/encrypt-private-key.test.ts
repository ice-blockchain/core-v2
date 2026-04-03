import { describe, it, expect } from 'vitest';
import { generateKeyPair } from './generate-key-pair';
import { encryptPrivateKey, decryptPrivateKey } from './encrypt-private-key';

describe('encryptPrivateKey / decryptPrivateKey', () => {
  it('round-trips with correct password', async () => {
    const kp = generateKeyPair();
    const encrypted = await encryptPrivateKey(kp.privateKeyPem, 'secret123');
    const decrypted = await decryptPrivateKey(encrypted, 'secret123');
    expect(decrypted).toBe(kp.privateKeyPem);
  });

  it('fails with wrong password', async () => {
    const kp = generateKeyPair();
    const encrypted = await encryptPrivateKey(kp.privateKeyPem, 'correct');
    await expect(decryptPrivateKey(encrypted, 'wrong')).rejects.toThrow();
  });

  it('produces all required fields as base64', async () => {
    const kp = generateKeyPair();
    const encrypted = await encryptPrivateKey(kp.privateKeyPem, 'pass');
    expect(encrypted.salt).toBeTruthy();
    expect(encrypted.nonce).toBeTruthy();
    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.mac).toBeTruthy();
    expect(Object.keys(encrypted).sort()).toEqual(['ciphertext', 'mac', 'nonce', 'salt']);
  });
});
