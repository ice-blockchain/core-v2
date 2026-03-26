import { describe, it, expect } from 'vitest';
import { x25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/ciphers/webcrypto';
import {
  generatePulseKeyPair,
  pulseSign,
  pulseVerify,
  pulseEncrypt,
  pulseDecrypt,
  pulseSharedSecret,
  pulseStretchPassword,
} from './pulse-vault';

describe('generatePulseKeyPair', () => {
  it('produces valid key pair with correct lengths', () => {
    const keyPair = generatePulseKeyPair();

    expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
    expect(keyPair.publicKey.length).toBe(32);
    expect(keyPair.privateKey.length).toBe(32);
  });
});

describe('pulseSign and pulseVerify', () => {
  it('signs data and verifies the signature', () => {
    const keyPair = generatePulseKeyPair();
    const data = new TextEncoder().encode('hello pulse');

    const signature = pulseSign(data, keyPair.privateKey);
    const isValid = pulseVerify({
      data,
      signature,
      publicKey: keyPair.publicKey,
    });

    expect(isValid).toBe(true);
  });

  it('rejects signature with wrong public key', () => {
    const keyPairA = generatePulseKeyPair();
    const keyPairB = generatePulseKeyPair();
    const data = new TextEncoder().encode('hello');

    const signature = pulseSign(data, keyPairA.privateKey);
    const isValid = pulseVerify({
      data,
      signature,
      publicKey: keyPairB.publicKey,
    });

    expect(isValid).toBe(false);
  });
});

describe('pulseEncrypt and pulseDecrypt', () => {
  it('encrypts and decrypts data roundtrip', () => {
    const key = randomBytes(32);
    const plaintext = new TextEncoder().encode('secret message');

    const encrypted = pulseEncrypt({ data: plaintext, key });
    const decrypted = pulseDecrypt({ encrypted, key });

    expect(new TextDecoder().decode(decrypted)).toBe('secret message');
  });
});

describe('pulseSharedSecret', () => {
  it('produces identical shared secret from both sides', () => {
    const alicePrivate = x25519.utils.randomPrivateKey();
    const alicePublic = x25519.getPublicKey(alicePrivate);
    const bobPrivate = x25519.utils.randomPrivateKey();
    const bobPublic = x25519.getPublicKey(bobPrivate);

    const secretFromAlice = pulseSharedSecret({
      theirPublicKey: bobPublic,
      myPrivateKey: alicePrivate,
    });

    const secretFromBob = pulseSharedSecret({
      theirPublicKey: alicePublic,
      myPrivateKey: bobPrivate,
    });

    expect(Buffer.from(secretFromAlice)).toEqual(Buffer.from(secretFromBob));
  });
});

describe('pulseStretchPassword', () => {
  it('produces deterministic output for same password and salt', () => {
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

    const result1 = pulseStretchPassword({ password: 'my-password', salt });
    const result2 = pulseStretchPassword({ password: 'my-password', salt });

    expect(Buffer.from(result1)).toEqual(Buffer.from(result2));
    expect(result1.length).toBe(32);
  });
});
