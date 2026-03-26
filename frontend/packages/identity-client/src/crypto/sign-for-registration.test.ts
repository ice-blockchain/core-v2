import { describe, it, expect } from 'vitest';
import { generateKeyPair } from './generate-key-pair';
import { signForRegistration } from './sign-for-registration';

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
