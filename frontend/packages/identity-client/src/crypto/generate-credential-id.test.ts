import { describe, it, expect } from 'vitest';
import { generateKeyPair } from './generate-key-pair';
import { generateCredentialId } from './generate-credential-id';

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
