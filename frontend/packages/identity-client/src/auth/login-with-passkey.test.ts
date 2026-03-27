import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LoginDataSource } from '../data-sources/login-data-source';
import type { TokenManager } from '../token/token-manager';
import type { UserActionChallenge } from '../types';
import { loginWithPasskey } from './login-with-passkey';
import { IdentityErrorCode } from '../errors';

vi.mock('../platform/passkey', () => ({
  isPasskeyAvailable: vi.fn(() => true),
  getPasskeyAssertion: vi.fn(() =>
    Promise.resolve({
      credentialId: 'cred-id',
      clientDataJSON: 'Y2xpZW50RGF0YQ==',
      authenticatorData: 'YXV0aERhdGE=',
      signature: 'c2ln',
      userHandle: 'dXNlcg==',
    }),
  ),
}));

function createMockChallenge(): UserActionChallenge {
  return {
    challenge: 'login-challenge',
    challengeIdentifier: 'challenge-id-1',
    rp: { id: 'example.com', name: 'Example' },
    allowCredentials: {
      webauthn: [{ type: 'public-key', id: 'webauthn-cred-1' }],
      passwordProtectedKey: null,
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
  return { loginDataSource, tokenManager };
}

describe('loginWithPasskey', () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps(createMockChallenge());
  });

  it('completes passkey login and stores tokens', async () => {
    const result = await loginWithPasskey('alice', deps);
    expect(result).toBe('alice');
    expect(deps.loginDataSource.completeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeIdentifier: 'challenge-id-1',
        firstFactor: expect.objectContaining({ kind: 'Fido2' }),
      }),
    );
    expect(deps.tokenManager.setTokens).toHaveBeenCalledWith('alice', {
      token: 'tok',
      refreshToken: 'ref',
    });
  });

  it('throws when passkeys are not available', async () => {
    const { isPasskeyAvailable } = await import('../platform/passkey');
    vi.mocked(isPasskeyAvailable).mockReturnValueOnce(false);
    await expect(loginWithPasskey('alice', deps)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_NOT_AVAILABLE,
    });
  });
});
