import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RegistrationDataSource } from '../data-sources/registration-data-source';
import type { TokenManager } from '../token/token-manager';
import type { UserRegistrationChallenge } from '../types';
import { registerWithPasskey } from './register-with-passkey';
import { IdentityErrorCode } from '../errors';

vi.mock('../platform/passkey', () => ({
  isPasskeyAvailable: vi.fn(() => true),
  createPasskeyCredential: vi.fn(() =>
    Promise.resolve({
      credentialId: 'cred-id-123',
      clientDataJSON: 'Y2xpZW50RGF0YQ==',
      attestationObject: 'YXR0ZXN0YXRpb24=',
    }),
  ),
}));

const mockChallenge: UserRegistrationChallenge = {
  temporaryAuthenticationToken: 'temp-token-abc',
  rp: { id: 'example.com', name: 'Example' },
  user: { id: 'user-1', name: 'alice@example.com', displayName: 'Alice' },
  challenge: 'Y2hhbGxlbmdl',
  attestation: 'direct',
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  excludeCredentials: [],
  authenticatorSelection: null,
  supportedCredentialKinds: { firstFactor: ['Fido2', 'PasswordProtectedKey'], secondFactor: [] },
  allowedRecoveryCredentials: null,
};

function createMockDeps() {
  const registrationDataSource: RegistrationDataSource = {
    initRegistration: vi.fn(() => Promise.resolve(mockChallenge)),
    completeRegistration: vi.fn(() =>
      Promise.resolve({
        authentication: { token: 'access-tok', refreshToken: 'refresh-tok' },
        user: { id: 'user-1' },
      }),
    ),
  };
  const tokenManager: TokenManager = {
    getTokens: vi.fn(() => Promise.resolve(null)),
    setTokens: vi.fn(() => Promise.resolve()),
    clearTokens: vi.fn(() => Promise.resolve()),
    isTokenExpired: vi.fn(() => Promise.resolve(true)),
  };
  return { registrationDataSource, tokenManager };
}

describe('registerWithPasskey', () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps();
  });

  it('completes passkey registration and stores tokens', async () => {
    await registerWithPasskey('alice@example.com', deps);

    expect(deps.registrationDataSource.initRegistration).toHaveBeenCalledWith('alice@example.com', undefined);
    expect(deps.registrationDataSource.completeRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        firstFactorCredential: expect.objectContaining({ credentialKind: 'Fido2' }),
      }),
      'temp-token-abc',
      undefined,
    );
    expect(deps.tokenManager.setTokens).toHaveBeenCalledWith('alice@example.com', {
      token: 'access-tok',
      refreshToken: 'refresh-tok',
    });
  });

  it('throws when passkeys are not available', async () => {
    const { isPasskeyAvailable } = await import('../platform/passkey');
    vi.mocked(isPasskeyAvailable).mockReturnValueOnce(false);

    await expect(registerWithPasskey('alice@example.com', deps)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_NOT_AVAILABLE,
    });
  });

  it('throws when temporary auth token is null', async () => {
    const nullTokenChallenge = { ...mockChallenge, temporaryAuthenticationToken: null };
    vi.mocked(deps.registrationDataSource.initRegistration).mockResolvedValueOnce(nullTokenChallenge);

    await expect(registerWithPasskey('alice@example.com', deps)).rejects.toMatchObject({
      code: IdentityErrorCode.UNKNOWN,
    });
  });
});
