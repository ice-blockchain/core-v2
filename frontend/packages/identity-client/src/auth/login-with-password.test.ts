import { describe, it, expect, vi } from 'vitest';
import type { LoginDataSource } from '../data-sources/login-data-source';
import type { TokenManager } from '../token/token-manager';
import type { UserActionChallenge } from '../types';
import { generateKeyPair } from '../crypto/generate-key-pair';
import { generateCredentialId } from '../crypto/generate-credential-id';
import { encryptPrivateKey } from '../crypto/encrypt-private-key';
import { loginWithPassword } from './login-with-password';
import { IdentityErrorCode } from '../errors';

function createMockChallenge(credId?: string, encryptedKey?: string): UserActionChallenge {
  return {
    challenge: 'bG9naW4tY2hhbGxlbmdl',
    challengeIdentifier: 'challenge-id-1',
    rp: { id: 'example.com', name: 'Example' },
    allowCredentials: {
      webauthn: [{ type: 'public-key', id: 'webauthn-cred-1' }],
      passwordProtectedKey: encryptedKey
        ? [{ type: 'public-key', id: credId ?? 'ppk-cred-1', encryptedPrivateKey: encryptedKey }]
        : null,
    },
    supportedCredentialKinds: [{ kind: 'Fido2', factor: 'first', requiresSecondFactor: false }],
    attestation: 'direct',
    userVerification: 'preferred',
    externalAuthenticationUrl: '',
  };
}

function createMockDeps(challenge: UserActionChallenge) {
  const loginDataSource: LoginDataSource = {
    initLogin: vi.fn(() => Promise.resolve(challenge)),
    completeLogin: vi.fn(() => Promise.resolve({ token: 'tok', refreshToken: 'ref' })),
  };
  const tokenManager: TokenManager = {
    getTokens: vi.fn(() => Promise.resolve(null)),
    setTokens: vi.fn(() => Promise.resolve()),
    clearTokens: vi.fn(() => Promise.resolve()),
    isTokenExpired: vi.fn(() => Promise.resolve(true)),
  };
  return { loginDataSource, tokenManager, origin: 'https://example.com' };
}

describe('loginWithPassword', () => {
  it('decrypts key, signs challenge, and stores tokens', async () => {
    const kp = generateKeyPair();
    const credId = generateCredentialId(kp.publicKey);
    const encrypted = await encryptPrivateKey(kp.privateKeyPem, 'mypass');
    const challenge = createMockChallenge(credId, JSON.stringify(encrypted));
    const deps = createMockDeps(challenge);

    const result = await loginWithPassword({ username: 'bob', password: 'mypass' }, deps);
    expect(result).toBe('bob');
    expect(deps.loginDataSource.completeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        firstFactor: expect.objectContaining({ kind: 'PasswordProtectedKey' }),
      }),
    );
    expect(deps.tokenManager.setTokens).toHaveBeenCalled();
  });

  it('throws when no password credentials exist', async () => {
    const challenge = createMockChallenge();
    const deps = createMockDeps(challenge);
    await expect(loginWithPassword({ username: 'bob', password: 'pass' }, deps)).rejects.toMatchObject({
      code: IdentityErrorCode.INVALID_CREDENTIALS,
    });
  });

  it('throws when encrypted private key is malformed JSON', async () => {
    const challenge = createMockChallenge(undefined, 'not-valid-json{{{');
    const deps = createMockDeps(challenge);
    await expect(loginWithPassword({ username: 'bob', password: 'pass' }, deps)).rejects.toMatchObject({
      code: IdentityErrorCode.INVALID_CREDENTIALS,
    });
  });

  it('throws when encrypted private key has missing fields', async () => {
    const challenge = createMockChallenge(undefined, JSON.stringify({ salt: 'abc', nonce: '' }));
    const deps = createMockDeps(challenge);
    await expect(loginWithPassword({ username: 'bob', password: 'pass' }, deps)).rejects.toMatchObject({
      code: IdentityErrorCode.INVALID_CREDENTIALS,
      message: 'Malformed encrypted private key',
    });
  });

  it('throws INVALID_CREDENTIALS when password is wrong', async () => {
    const kp = generateKeyPair();
    const credId = generateCredentialId(kp.publicKey);
    const encrypted = await encryptPrivateKey(kp.privateKeyPem, 'correct-pass');
    const challenge = createMockChallenge(credId, JSON.stringify(encrypted));
    const deps = createMockDeps(challenge);
    await expect(loginWithPassword({ username: 'bob', password: 'wrong-pass' }, deps)).rejects.toMatchObject({
      code: IdentityErrorCode.INVALID_CREDENTIALS,
    });
  });

  it('throws when credential has no encrypted private key', async () => {
    const challenge: UserActionChallenge = {
      ...createMockChallenge(),
      allowCredentials: {
        webauthn: null,
        passwordProtectedKey: [{ type: 'public-key', id: 'ppk-1' }],
      },
    };
    const deps = createMockDeps(challenge);
    await expect(loginWithPassword({ username: 'bob', password: 'pass' }, deps)).rejects.toMatchObject({
      code: IdentityErrorCode.INVALID_CREDENTIALS,
    });
  });

  it('preserves original error as cause for malformed JSON', async () => {
    const challenge = createMockChallenge(undefined, 'not-json{{{');
    const deps = createMockDeps(challenge);
    await expect(loginWithPassword({ username: 'bob', password: 'pass' }, deps)).rejects.toSatisfy(
      (error: Error) => error.cause instanceof Error,
    );
  });
});
