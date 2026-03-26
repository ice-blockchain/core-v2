import { describe, it, expect } from 'vitest';
import { generateKeyPair } from './generate-key-pair';
import { signForLogin } from './sign-for-login';

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
