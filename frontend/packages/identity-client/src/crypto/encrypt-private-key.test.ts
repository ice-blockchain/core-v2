import { describe, it, expect, vi } from 'vitest';
import { generateKeyPair } from './generate-key-pair';
import { encryptPrivateKey, decryptPrivateKey } from './encrypt-private-key';

describe('setNativePbkdf2', () => {
  it('throws on second call', async () => {
    vi.resetModules();
    const mod = await import('./encrypt-private-key');
    const fakeFn = () => new Uint8Array(32);
    mod.setNativePbkdf2(fakeFn);
    expect(() => mod.setNativePbkdf2(fakeFn)).toThrow('nativePbkdf2 already set');
  });
});

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
