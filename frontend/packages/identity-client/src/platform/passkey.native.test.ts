import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRegistrationChallenge, UserActionChallenge } from '../types';
import { IdentityErrorCode } from '../errors';

const mockPasskeyCreate = vi.fn();
const mockPasskeyGet = vi.fn();
const mockPasskeyIsSupported = vi.fn(() => true);

vi.mock('react-native-passkey', () => ({
  Passkey: {
    isSupported: () => mockPasskeyIsSupported(),
    create: (...args: unknown[]) => mockPasskeyCreate(...args),
    get: (...args: unknown[]) => mockPasskeyGet(...args),
  },
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { warning: vi.fn() },
}));

// Must import after mocks are set up
const { isPasskeyAvailable, createPasskeyCredential, getPasskeyAssertion } = await import('./passkey.native');

const mockRegistrationChallenge: UserRegistrationChallenge = {
  temporaryAuthenticationToken: 'tok',
  rp: { id: 'example.com', name: 'Example' },
  user: { id: 'dXNlci0x', name: 'alice', displayName: 'Alice' },
  challenge: 'Y2hhbGxlbmdlLXBhc3NrZXk',
  challengeIdentifier: 'ci-passkey-1',
  attestation: 'direct',
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  excludeCredentials: [],
  authenticatorSelection: null,
  supportedCredentialKinds: null,
  allowedRecoveryCredentials: null,
};

const mockActionChallenge: UserActionChallenge = {
  challenge: 'Y2hhbGxlbmdlLXBhc3NrZXk',
  challengeIdentifier: 'ci-1',
  rp: { id: 'example.com', name: 'Example' },
  allowCredentials: {
    webauthn: [{ type: 'public-key', id: 'Y3JlZC0x' }],
    passwordProtectedKey: null,
  },
  supportedCredentialKinds: [],
  attestation: 'direct',
  userVerification: 'preferred',
  externalAuthenticationUrl: '',
};

describe('isPasskeyAvailable', () => {
  it('delegates to Passkey.isSupported', () => {
    expect(isPasskeyAvailable()).toBe(true);
  });

  it('returns false when not supported', () => {
    mockPasskeyIsSupported.mockReturnValueOnce(false);
    expect(isPasskeyAvailable()).toBe(false);
  });
});

describe('createPasskeyCredential', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps native result to PasskeyRegistrationResult', async () => {
    mockPasskeyCreate.mockResolvedValueOnce({
      rawId: 'raw-id-123',
      response: {
        clientDataJSON: 'client-data',
        attestationObject: 'attestation-obj',
      },
    });

    const result = await createPasskeyCredential(mockRegistrationChallenge);

    expect(result.credentialId).toBe('raw-id-123');
    expect(result.clientDataJSON).toBe('client-data');
    expect(result.attestationObject).toBe('attestation-obj');
  });

  it('includes authenticatorSelection when present in challenge', async () => {
    const challengeWithSelection = {
      ...mockRegistrationChallenge,
      authenticatorSelection: { userVerification: 'required' as const },
    };
    mockPasskeyCreate.mockResolvedValueOnce({
      rawId: 'id',
      response: { clientDataJSON: 'cd', attestationObject: 'ao' },
    });

    await createPasskeyCredential(challengeWithSelection);

    expect(mockPasskeyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticatorSelection: { userVerification: 'required' },
      }),
    );
  });

  it('omits authenticatorSelection when null', async () => {
    mockPasskeyCreate.mockResolvedValueOnce({
      rawId: 'id',
      response: { clientDataJSON: 'cd', attestationObject: 'ao' },
    });

    await createPasskeyCredential(mockRegistrationChallenge);

    const callArg = mockPasskeyCreate.mock.calls[0]![0];
    expect(callArg).not.toHaveProperty('authenticatorSelection');
  });

  it('maps UserCancelled error to PASSKEY_CANCELLED', async () => {
    mockPasskeyCreate.mockRejectedValueOnce({ error: 'UserCancelled', message: 'The user cancelled the request.' });

    await expect(createPasskeyCredential(mockRegistrationChallenge)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_CANCELLED,
    });
  });

  it('maps Interrupted error to PASSKEY_CANCELLED', async () => {
    mockPasskeyCreate.mockRejectedValueOnce({ error: 'Interrupted', message: 'The operation was interrupted and may be retried.' });

    await expect(createPasskeyCredential(mockRegistrationChallenge)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_CANCELLED,
    });
  });

  it('maps generic error to PASSKEY_VALIDATION_FAILED', async () => {
    mockPasskeyCreate.mockRejectedValueOnce({ error: 'RequestFailed', message: 'The request failed.' });

    await expect(createPasskeyCredential(mockRegistrationChallenge)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_VALIDATION_FAILED,
    });
  });

  it('maps plain Error to PASSKEY_VALIDATION_FAILED', async () => {
    mockPasskeyCreate.mockRejectedValueOnce(new Error('Something went wrong'));

    await expect(createPasskeyCredential(mockRegistrationChallenge)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_VALIDATION_FAILED,
    });
  });
});

describe('getPasskeyAssertion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps native result to PasskeyAuthResult', async () => {
    mockPasskeyGet.mockResolvedValueOnce({
      rawId: 'raw-id',
      response: {
        clientDataJSON: 'cd',
        authenticatorData: 'ad',
        signature: 'sig',
        userHandle: 'uh',
      },
    });

    const result = await getPasskeyAssertion(mockActionChallenge);

    expect(result.credentialId).toBe('raw-id');
    expect(result.clientDataJSON).toBe('cd');
    expect(result.authenticatorData).toBe('ad');
    expect(result.signature).toBe('sig');
    expect(result.userHandle).toBe('uh');
  });

  it('handles null userHandle', async () => {
    mockPasskeyGet.mockResolvedValueOnce({
      rawId: 'raw-id',
      response: {
        clientDataJSON: 'cd',
        authenticatorData: 'ad',
        signature: 'sig',
        userHandle: null,
      },
    });

    const result = await getPasskeyAssertion(mockActionChallenge);
    expect(result.userHandle).toBeNull();
  });

  it('passes allowCredentials from webauthn field', async () => {
    mockPasskeyGet.mockResolvedValueOnce({
      rawId: 'id',
      response: { clientDataJSON: 'cd', authenticatorData: 'ad', signature: 'sig', userHandle: null },
    });

    await getPasskeyAssertion(mockActionChallenge);

    expect(mockPasskeyGet).toHaveBeenCalledWith(
      expect.objectContaining({
        allowCredentials: [{ type: 'public-key', id: 'Y3JlZC0x' }],
      }),
    );
  });

  it('omits allowCredentials when webauthn is null', async () => {
    const challengeNoWebauthn = {
      ...mockActionChallenge,
      allowCredentials: { webauthn: null, passwordProtectedKey: null },
    };
    mockPasskeyGet.mockResolvedValueOnce({
      rawId: 'id',
      response: { clientDataJSON: 'cd', authenticatorData: 'ad', signature: 'sig', userHandle: null },
    });

    await getPasskeyAssertion(challengeNoWebauthn);

    const callArg = mockPasskeyGet.mock.calls[0]![0];
    expect(callArg).not.toHaveProperty('allowCredentials');
  });

  it('maps UserCancelled error to PASSKEY_CANCELLED', async () => {
    mockPasskeyGet.mockRejectedValueOnce({ error: 'UserCancelled', message: 'The user cancelled the request.' });

    await expect(getPasskeyAssertion(mockActionChallenge)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_CANCELLED,
    });
  });

  it('maps non-object error to PASSKEY_VALIDATION_FAILED', async () => {
    mockPasskeyGet.mockRejectedValueOnce('string error');

    await expect(getPasskeyAssertion(mockActionChallenge)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_VALIDATION_FAILED,
    });
  });
});
