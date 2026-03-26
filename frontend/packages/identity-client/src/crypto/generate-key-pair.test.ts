import { describe, it, expect } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519';
import { generateKeyPair, parseSeedFromPem } from './generate-key-pair';

describe('generateKeyPair', () => {
  it('produces valid Ed25519 PEM keys', () => {
    const kp = generateKeyPair();
    expect(kp.seed).toHaveLength(32);
    expect(kp.publicKey).toHaveLength(32);
    expect(kp.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
    expect(kp.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
  });

  it('round-trips seed through PEM', () => {
    const kp = generateKeyPair();
    const extracted = parseSeedFromPem(kp.privateKeyPem);
    expect(extracted).toEqual(kp.seed);
  });

  it('derives matching public key from seed', () => {
    const kp = generateKeyPair();
    const derived = ed25519.getPublicKey(kp.seed);
    expect(derived).toEqual(kp.publicKey);
  });
});

describe('parseSeedFromPem', () => {
  it('rejects PEM with unexpected byte length', () => {
    const invalidPem = '-----BEGIN PRIVATE KEY-----\nYWJj\n-----END PRIVATE KEY-----';
    expect(() => parseSeedFromPem(invalidPem)).toThrow('expected 48 bytes');
  });

  it('rejects PEM with correct length but wrong prefix', () => {
    const wrongPrefix = new Uint8Array(48).fill(0xff);
    let binary = '';
    for (const byte of wrongPrefix) binary += String.fromCharCode(byte);
    const b64 = btoa(binary);
    const pem = `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----`;
    expect(() => parseSeedFromPem(pem)).toThrow('wrong prefix');
  });
});
