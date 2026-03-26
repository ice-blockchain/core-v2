import { describe, it, expect } from 'vitest';
import { generatePulseKeyPair, derivePublicKey } from './pulse-key-pair.js';
import { pulseSign, pulseVerify } from './pulse-sign.js';
import { pulseEncrypt, pulseDecrypt } from './pulse-encrypt.js';
import { pulseSharedSecret } from './pulse-shared-secret.js';
import { pulseStretchPassword, generatePulseSalt } from './pulse-password.js';
import {
  createPulseNamespace,
  parsePulseNamespace,
  verifyPulseNamespaceWrite,
} from './pulse-namespace.js';

describe('pulse-vault', () => {
  describe('key pair generation', () => {
    it('generates a 32-byte public key and 32-byte private key', () => {
      const keyPair = generatePulseKeyPair();
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(32);
      expect(keyPair.privateKey.length).toBe(32);
    });

    it('derives the same public key from a private key', () => {
      const keyPair = generatePulseKeyPair();
      const derived = derivePublicKey(keyPair.privateKey);
      expect(derived).toEqual(keyPair.publicKey);
    });

    it('generates unique key pairs', () => {
      const first = generatePulseKeyPair();
      const second = generatePulseKeyPair();
      expect(first.privateKey).not.toEqual(second.privateKey);
    });
  });

  describe('sign and verify', () => {
    it('verifies a valid signature', () => {
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

    it('rejects a tampered message', () => {
      const keyPair = generatePulseKeyPair();
      const data = new TextEncoder().encode('hello pulse');
      const signature = pulseSign(data, keyPair.privateKey);

      const tampered = new TextEncoder().encode('tampered data');
      const isValid = pulseVerify({
        data: tampered,
        signature,
        publicKey: keyPair.publicKey,
      });

      expect(isValid).toBe(false);
    });

    it('rejects a signature from a different key', () => {
      const keyPair = generatePulseKeyPair();
      const otherKeyPair = generatePulseKeyPair();
      const data = new TextEncoder().encode('hello pulse');
      const signature = pulseSign(data, keyPair.privateKey);

      const isValid = pulseVerify({
        data,
        signature,
        publicKey: otherKeyPair.publicKey,
      });

      expect(isValid).toBe(false);
    });
  });

  describe('encrypt and decrypt', () => {
    it('round-trips data through encryption', () => {
      const key = generatePulseSalt();
      const plaintext = new TextEncoder().encode('secret message');

      const encrypted = pulseEncrypt(plaintext, key);
      expect(encrypted.ciphertext).not.toEqual(plaintext);
      expect(encrypted.nonce.length).toBe(12);

      const decrypted = pulseDecrypt({
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        key,
      });

      expect(decrypted).toEqual(plaintext);
    });

    it('produces different ciphertexts for the same plaintext', () => {
      const key = generatePulseSalt();
      const plaintext = new TextEncoder().encode('secret message');

      const first = pulseEncrypt(plaintext, key);
      const second = pulseEncrypt(plaintext, key);

      expect(first.ciphertext).not.toEqual(second.ciphertext);
      expect(first.nonce).not.toEqual(second.nonce);
    });
  });

  describe('shared secret', () => {
    it('derives the same shared secret from both sides', () => {
      const alice = generatePulseKeyPair();
      const bob = generatePulseKeyPair();

      const aliceSecret = pulseSharedSecret({
        theirPublicKey: bob.publicKey,
        myPrivateKey: alice.privateKey,
      });

      const bobSecret = pulseSharedSecret({
        theirPublicKey: alice.publicKey,
        myPrivateKey: bob.privateKey,
      });

      expect(aliceSecret).toEqual(bobSecret);
    });

    it('produces a 32-byte shared secret', () => {
      const alice = generatePulseKeyPair();
      const bob = generatePulseKeyPair();

      const secret = pulseSharedSecret({
        theirPublicKey: bob.publicKey,
        myPrivateKey: alice.privateKey,
      });

      expect(secret.length).toBe(32);
    });
  });

  describe('password stretching', () => {
    it('produces deterministic output for the same password and salt', () => {
      const salt = generatePulseSalt();
      const first = pulseStretchPassword('my-password', salt);
      const second = pulseStretchPassword('my-password', salt);
      expect(first).toEqual(second);
    });

    it('produces different output for different salts', () => {
      const saltA = generatePulseSalt();
      const saltB = generatePulseSalt();
      const first = pulseStretchPassword('my-password', saltA);
      const second = pulseStretchPassword('my-password', saltB);
      expect(first).not.toEqual(second);
    });

    it('produces a 32-byte key', () => {
      const salt = generatePulseSalt();
      const key = pulseStretchPassword('my-password', salt);
      expect(key.length).toBe(32);
    });

    it('generates a 32-byte salt', () => {
      const salt = generatePulseSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(32);
    });
  });

  describe('namespace', () => {
    it('creates and parses a namespace round-trip', () => {
      const keyPair = generatePulseKeyPair();
      const namespace = createPulseNamespace(keyPair.publicKey);

      expect(namespace.startsWith('~')).toBe(true);

      const parsed = parsePulseNamespace(`${namespace}/some/path`);
      expect(parsed).not.toBeNull();
      expect(parsed!.subPath).toBe('some/path');
    });

    it('parses a namespace without a subpath', () => {
      const keyPair = generatePulseKeyPair();
      const namespace = createPulseNamespace(keyPair.publicKey);

      const parsed = parsePulseNamespace(namespace);
      expect(parsed).not.toBeNull();
      expect(parsed!.subPath).toBe('');
    });

    it('returns null for non-namespaced paths', () => {
      const parsed = parsePulseNamespace('/regular/path');
      expect(parsed).toBeNull();
    });

    it('verifies a valid namespace write', () => {
      const keyPair = generatePulseKeyPair();
      const namespace = createPulseNamespace(keyPair.publicKey);
      const path = `${namespace}/data`;
      const data = new TextEncoder().encode('hello');
      const signature = pulseSign(data, keyPair.privateKey);

      const isValid = verifyPulseNamespaceWrite({
        path,
        data,
        signature,
        publicKey: keyPair.publicKey,
      });

      expect(isValid).toBe(true);
    });

    it('rejects a namespace write from a non-owner', () => {
      const owner = generatePulseKeyPair();
      const attacker = generatePulseKeyPair();
      const namespace = createPulseNamespace(owner.publicKey);
      const path = `${namespace}/data`;
      const data = new TextEncoder().encode('hello');
      const signature = pulseSign(data, attacker.privateKey);

      const isValid = verifyPulseNamespaceWrite({
        path,
        data,
        signature,
        publicKey: attacker.publicKey,
      });

      expect(isValid).toBe(false);
    });
  });
});
