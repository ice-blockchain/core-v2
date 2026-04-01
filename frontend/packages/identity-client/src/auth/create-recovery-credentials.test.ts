import { describe, it, expect, vi } from 'vitest';
import { createRecoveryCredentials } from './create-recovery-credentials';

vi.mock('./sign-user-action', () => ({
  signUserAction: vi.fn(() => Promise.resolve('ua-token')),
}));

vi.mock('../crypto/sign-for-registration', () => ({
  signForRegistration: vi.fn(() => Promise.resolve({
    credId: 'rec-cred-id',
    clientData: 'cd',
    attestationData: 'ad',
    encryptedPrivateKey: '{"encrypted":"key"}',
  })),
}));

vi.mock('../crypto/generate-key-pair', () => ({
  generateKeyPair: vi.fn(() => ({
    seed: new Uint8Array(32),
    publicKey: new Uint8Array(32),
    publicKeyPem: 'pub-pem',
    privateKeyPem: 'priv-pem',
  })),
}));

function createMockDeps() {
  return {
    credentialsDataSource: {
      listCredentials: vi.fn(),
      initCreateCredential: vi.fn(() => Promise.resolve({
        challenge: 'ch',
        challengeIdentifier: 'ci-jwt-token',
        rp: { id: 'x', name: 'X' },
        user: { id: 'u', name: 'u', displayName: 'U' },
        attestation: 'direct',
        pubKeyCredParams: [],
        excludeCredentials: [],
        authenticatorSelection: null,
        supportedCredentialKinds: null,
        temporaryAuthenticationToken: null,
        allowedRecoveryCredentials: null,
      })),
      createCredential: vi.fn(() => Promise.resolve({
        credentialUuid: 'uuid-1',
        credentialId: 'cred-1',
        dateCreated: '2025-01-01',
        isActive: true,
        kind: 'RecoveryKey',
        name: 'RecKey-1',
        origin: 'https://example.com',
        relyingPartyId: 'example.com',
        publicKey: 'pk',
      })),
    },
    userActionDataSource: { initAction: vi.fn(), completeAction: vi.fn() },
    origin: 'https://example.com',
  };
}

describe('createRecoveryCredentials', () => {
  it('creates recovery credentials and returns code', async () => {
    const deps = createMockDeps();

    const result = await createRecoveryCredentials('alice', { kind: 'password', password: 'pass' }, deps);

    expect(result.recoveryCode).toHaveLength(32);
    expect(result.identityKeyName).toBe('RecKey-1');
    expect(result.recoveryKeyId).toBe('cred-1');
    expect(deps.credentialsDataSource.initCreateCredential).toHaveBeenCalledWith('RecoveryKey', 'alice');
    expect(deps.credentialsDataSource.createCredential).toHaveBeenCalled();
  });
});
