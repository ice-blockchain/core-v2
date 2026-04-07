import { describe, it, expect, vi } from 'vitest';
import { IdentityErrorCode } from '../errors';
import { recoverAccount } from './recover-account';

vi.mock('../platform/passkey', () => ({
  isPasskeyAvailable: vi.fn(() => true),
  createPasskeyCredential: vi.fn(() =>
    Promise.resolve({
      credentialId: 'passkey-cred',
      clientDataJSON: 'cd-json',
      attestationObject: 'att-obj',
    }),
  ),
  getPasskeyAssertion: vi.fn(),
}));

vi.mock('../crypto/sign-for-registration', () => ({
  signForRegistration: vi.fn(() =>
    Promise.resolve({
      credId: 'new-cred',
      clientData: 'cd',
      attestationData: 'ad',
      encryptedPrivateKey: '{"enc":"key"}',
    }),
  ),
}));

vi.mock('../crypto/generate-key-pair', () => ({
  generateKeyPair: vi.fn(() => ({
    seed: new Uint8Array(32),
    publicKey: new Uint8Array(32),
    publicKeyPem: 'pub',
    privateKeyPem: 'priv',
  })),
}));

vi.mock('../crypto/encrypt-private-key', () => ({
  decryptPrivateKey: vi.fn(() => Promise.resolve('decrypted-pem')),
  encryptPrivateKey: vi.fn(() =>
    Promise.resolve({ salt: 's', nonce: 'n', ciphertext: 'c', mac: 'm' }),
  ),
}));

vi.mock('../crypto/sign-for-login', () => ({
  signForLogin: vi.fn(() => ({
    credId: 'recovery-cred-id',
    clientData: 'rec-cd',
    signature: 'rec-sig',
  })),
}));

function createMockChallenge() {
  return {
    temporaryAuthenticationToken: 'temp-token',
    challenge: 'Y2hhbGxlbmdl',
    challengeIdentifier: 'ci-recovery-1',
    rp: { id: 'example.com', name: 'Example' },
    user: { id: 'u1', name: 'alice', displayName: 'Alice' },
    attestation: 'direct',
    pubKeyCredParams: [],
    excludeCredentials: [],
    authenticatorSelection: null,
    supportedCredentialKinds: null,
    allowedRecoveryCredentials: [
      {
        id: 'rec-cred-1',
        encryptedRecoveryKey: JSON.stringify({
          salt: 's',
          nonce: 'n',
          ciphertext: 'c',
          mac: 'm',
        }),
      },
    ],
  };
}

function createMockDeps(challenge?: ReturnType<typeof createMockChallenge>) {
  return {
    recoveryDataSource: {
      initRecovery: vi.fn(() =>
        Promise.resolve(challenge ?? createMockChallenge()),
      ),
      completeRecovery: vi.fn(() =>
        Promise.resolve({
          credential: { uuid: 'cr-1', kind: 'PasswordProtectedKey', name: 'Default Credential' },
          user: { id: 'u1' },
        }),
      ),
    },
    origin: 'https://example.com',
  };
}

describe('recoverAccount', () => {
  it('recovers with password credential without storing tokens', async () => {
    const deps = createMockDeps();
    await recoverAccount(
      {
        username: 'alice',
        recoveryCode: 'recovery-pass',
        credentialId: 'rec-cred-1',
        newCredentialKind: 'PasswordProtectedKey',
        newPassword: 'new-pass',
      },
      deps,
    );
    expect(deps.recoveryDataSource.initRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'alice',
        credentialId: 'rec-cred-1',
      }),
    );
    expect(deps.recoveryDataSource.completeRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        newCredentials: expect.any(Object),
        recovery: expect.any(Object),
      }),
      'temp-token',
    );
  });

  it('signs recovery assertion using base64url-encoded newCredentials', async () => {
    const { signForLogin } = await import('../crypto/sign-for-login');
    const deps = createMockDeps();
    await recoverAccount(
      {
        username: 'alice',
        recoveryCode: 'recovery-pass',
        credentialId: 'rec-cred-1',
        newCredentialKind: 'PasswordProtectedKey',
        newPassword: 'new-pass',
      },
      deps,
    );
    const callArgs = vi.mocked(signForLogin).mock.calls[0]![0];
    expect(callArgs.challenge).not.toBe('Y2hhbGxlbmdl');
    expect(callArgs.credentialId).toBe('rec-cred-1');
  });

  it('throws when temporary token is missing', async () => {
    const challenge = createMockChallenge();
    (challenge as { temporaryAuthenticationToken: string | null }).temporaryAuthenticationToken = null;
    const deps = createMockDeps(challenge);
    await expect(
      recoverAccount(
        {
          username: 'alice',
          recoveryCode: 'recovery-pass',
          credentialId: 'rec-cred-1',
          newCredentialKind: 'PasswordProtectedKey',
          newPassword: 'new',
        },
        deps,
      ),
    ).rejects.toThrow();
  });

  it('recovers with passkey credential', async () => {
    const deps = createMockDeps();
    await recoverAccount(
      {
        username: 'alice',
        recoveryCode: 'recovery-pass',
        credentialId: 'rec-cred-1',
        newCredentialKind: 'Fido2',
      },
      deps,
    );
    expect(deps.recoveryDataSource.completeRecovery).toHaveBeenCalledWith(
      expect.objectContaining({
        newCredentials: expect.objectContaining({
          firstFactorCredential: expect.objectContaining({
            credentialKind: 'Fido2',
          }),
        }),
      }),
      'temp-token',
    );
  });

  it('throws INVALID_RECOVERY_CREDENTIALS when credential not found', async () => {
    const challenge = createMockChallenge();
    challenge.allowedRecoveryCredentials = [];
    const deps = createMockDeps(challenge);
    await expect(
      recoverAccount(
        {
          username: 'alice',
          recoveryCode: 'pass',
          credentialId: 'nonexistent',
          newCredentialKind: 'PasswordProtectedKey',
          newPassword: 'new',
        },
        deps,
      ),
    ).rejects.toMatchObject({
      code: IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS,
    });
  });
});
