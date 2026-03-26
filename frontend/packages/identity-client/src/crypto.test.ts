import { describe, it, expect } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519';
import {
  generateKeyPair,
  generateCredentialId,
  encryptPrivateKey,
  decryptPrivateKey,
  signForRegistration,
  signForLogin,
  parseSeedFromPem,
} from './crypto';

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

describe('toBase64Url encoding', () => {
  it('produces output without padding characters', () => {
    const kp = generateKeyPair();
    const result = signForLogin({
      challenge: 'dGVzdC1jaGFsbGVuZ2U',
      origin: 'https://example.com',
      privateKeyPem: kp.privateKeyPem,
      credentialId: 'cred-1',
    });
    expect(result.clientData).not.toContain('=');
    expect(result.signature).not.toContain('=');
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

describe('generateCredentialId', () => {
  it('produces XXXXX-XXXXX-XXXXX-XXXXX-XXXXX format', () => {
    const kp = generateKeyPair();
    const credId = generateCredentialId(kp.publicKey);
    expect(credId).toMatch(/^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/);
  });

  it('is deterministic for the same public key', () => {
    const kp = generateKeyPair();
    const a = generateCredentialId(kp.publicKey);
    const b = generateCredentialId(kp.publicKey);
    expect(a).toBe(b);
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
  });
});

describe('signForRegistration', () => {
  it('produces valid registration signature result', async () => {
    const kp = generateKeyPair();
    const result = await signForRegistration({
      challenge: 'test-challenge-abc',
      origin: 'https://example.com',
      keyPair: kp,
      password: 'mypassword',
    });

    expect(result.credId).toMatch(/^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/);
    expect(result.clientData).toBeTruthy();
    expect(result.attestationData).toBeTruthy();
    expect(JSON.parse(result.encryptedPrivateKey)).toHaveProperty('salt');
  });

  it('sorts JSON keys alphabetically in clientData', async () => {
    const kp = generateKeyPair();
    const result = await signForRegistration({
      challenge: 'ch',
      origin: 'https://example.com',
      keyPair: kp,
      password: 'pw',
    });

    const decoded = atob(result.clientData.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);
    const keys = Object.keys(parsed);
    expect(keys).toEqual([...keys].sort());
  });
});

describe('signForLogin', () => {
  it('produces valid login signature result', () => {
    const kp = generateKeyPair();
    const result = signForLogin({
      challenge: 'login-challenge',
      origin: 'https://example.com',
      privateKeyPem: kp.privateKeyPem,
      credentialId: 'AAAAA-BBBBB-CCCCC-DDDDD-EEEEE',
    });

    expect(result.credId).toBe('AAAAA-BBBBB-CCCCC-DDDDD-EEEEE');
    expect(result.clientData).toBeTruthy();
    expect(result.signature).toBeTruthy();
  });

  it('uses key.get as clientData type', () => {
    const kp = generateKeyPair();
    const result = signForLogin({
      challenge: 'ch',
      origin: 'https://example.com',
      privateKeyPem: kp.privateKeyPem,
      credentialId: 'ID',
    });

    const decoded = atob(result.clientData.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);
    expect(parsed.type).toBe('key.get');
  });
});
