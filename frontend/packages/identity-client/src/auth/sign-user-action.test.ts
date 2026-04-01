import { describe, it, expect, vi } from 'vitest';
import type { UserActionChallenge } from '../types';
import { IdentityErrorCode } from '../errors';
import { generateKeyPair } from '../crypto/generate-key-pair';
import { generateCredentialId } from '../crypto/generate-credential-id';
import { encryptPrivateKey } from '../crypto/encrypt-private-key';
import { signUserAction } from './sign-user-action';

vi.mock('../platform/passkey', () => ({
  isPasskeyAvailable: vi.fn(() => true),
  getPasskeyAssertion: vi.fn(() => Promise.resolve({
    credentialId: 'passkey-cred',
    clientDataJSON: 'cd-json',
    authenticatorData: 'auth-data',
    signature: 'passkey-sig',
    userHandle: null,
  })),
  createPasskeyCredential: vi.fn(),
}));

function createMockDeps(challenge: UserActionChallenge) {
  return {
    userActionDataSource: {
      initAction: vi.fn(() => Promise.resolve(challenge)),
      completeAction: vi.fn(() => Promise.resolve({ userAction: 'ua-token' })),
    },
    origin: 'https://example.com',
  };
}

async function buildChallengeWithPasswordCred() {
  const kp = generateKeyPair();
  const credId = generateCredentialId(kp.publicKey);
  const encrypted = await encryptPrivateKey(kp.privateKeyPem, 'mypass');
  return {
    challenge: 'Y2hhbGxlbmdlLXN0cmluZy10aGF0LWlzLWxvbmctZW5vdWdo',
    challengeIdentifier: 'ci-1',
    rp: { id: 'example.com', name: 'Example' },
    allowCredentials: {
      webauthn: [{ type: 'public-key', id: 'w-1' }],
      passwordProtectedKey: [{
        type: 'public-key',
        id: credId,
        encryptedPrivateKey: JSON.stringify(encrypted),
      }],
    },
    supportedCredentialKinds: [],
    attestation: 'direct',
    userVerification: 'preferred',
    externalAuthenticationUrl: '',
  };
}

function buildChallengeWithPasskeyCred() {
  return {
    challenge: 'Y2hhbGxlbmdlLXN0cmluZy10aGF0LWlzLWxvbmctZW5vdWdo',
    challengeIdentifier: 'ci-1',
    rp: { id: 'example.com', name: 'Example' },
    allowCredentials: {
      webauthn: [{ type: 'public-key', id: 'w-1' }],
      passwordProtectedKey: null,
    },
    supportedCredentialKinds: [],
    attestation: 'direct',
    userVerification: 'preferred',
    externalAuthenticationUrl: '',
  };
}

describe('signUserAction', () => {
  it('signs with password and returns userAction token', { timeout: 15_000 }, async () => {
    const challenge = await buildChallengeWithPasswordCred();
    const deps = createMockDeps(challenge);
    const result = await signUserAction({
      username: 'alice',
      httpMethod: 'POST',
      httpPath: '/auth/credentials',
      body: { key: 'value' },
      signingContext: { kind: 'password', password: 'mypass' },
    }, deps);
    expect(result).toBe('ua-token');
    expect(deps.userActionDataSource.initAction).toHaveBeenCalled();
    expect(deps.userActionDataSource.completeAction).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeIdentifier: 'ci-1',
        firstFactor: expect.objectContaining({ kind: 'PasswordProtectedKey' }),
      }),
      'alice',
    );
  });

  it('signs with passkey and returns userAction token', async () => {
    const challenge = buildChallengeWithPasskeyCred();
    const deps = createMockDeps(challenge);
    const result = await signUserAction({
      username: 'alice',
      httpMethod: 'POST',
      httpPath: '/auth/credentials',
      body: {},
      signingContext: { kind: 'passkey' },
    }, deps);
    expect(result).toBe('ua-token');
    expect(deps.userActionDataSource.completeAction).toHaveBeenCalledWith(
      expect.objectContaining({
        firstFactor: expect.objectContaining({ kind: 'Fido2' }),
      }),
      'alice',
    );
  });

  it('throws when no password credentials available', async () => {
    const challenge = buildChallengeWithPasskeyCred();
    const deps = createMockDeps(challenge);
    await expect(signUserAction({
      username: 'alice',
      httpMethod: 'POST',
      httpPath: '/',
      body: {},
      signingContext: { kind: 'password', password: 'p' },
    }, deps)).rejects.toMatchObject({ code: IdentityErrorCode.INVALID_CREDENTIALS });
  });
});
