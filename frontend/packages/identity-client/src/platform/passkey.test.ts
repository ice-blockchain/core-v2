import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { UserRegistrationChallenge, UserActionChallenge } from '../types';
import { IdentityErrorCode } from '../errors';
import { isPasskeyAvailable, createPasskeyCredential, getPasskeyAssertion } from './passkey.web';

const mockChallenge: UserRegistrationChallenge = {
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

function mockCredentialsApi() {
  const mockCreate = vi.fn();
  const mockGet = vi.fn();
  // Ensure window exists for the typeof check in isPasskeyAvailable
  if (typeof globalThis.window === 'undefined') {
    // @ts-expect-error -- stub window for Node test environment
    globalThis.window = {};
  }
  // @ts-expect-error -- stub PublicKeyCredential for Node test environment
  globalThis.PublicKeyCredential = class {};
  Object.defineProperty(globalThis, 'navigator', {
    value: { credentials: { create: mockCreate, get: mockGet } },
    writable: true,
    configurable: true,
  });
  return { mockCreate, mockGet };
}

describe('isPasskeyAvailable', () => {
  const originalWindow = globalThis.window;
  const originalNavigator = globalThis.navigator;
  const originalPublicKeyCredential = globalThis.PublicKeyCredential;

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.PublicKeyCredential = originalPublicKeyCredential;
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('returns true when WebAuthn APIs are available', () => {
    mockCredentialsApi();
    expect(isPasskeyAvailable()).toBe(true);
  });

  it('returns false when window is undefined', () => {
    // @ts-expect-error -- testing no-window environment
    delete globalThis.window;
    expect(isPasskeyAvailable()).toBe(false);
  });

  it('returns false when PublicKeyCredential is undefined', () => {
    mockCredentialsApi();
    // @ts-expect-error -- removing stub
    delete globalThis.PublicKeyCredential;
    expect(isPasskeyAvailable()).toBe(false);
  });
});

describe('createPasskeyCredential', () => {
  let mocks: ReturnType<typeof mockCredentialsApi>;

  beforeEach(() => {
    mocks = mockCredentialsApi();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns credential data on success', async () => {
    mocks.mockCreate.mockResolvedValueOnce({
      rawId: new Uint8Array([1, 2, 3]).buffer,
      response: {
        clientDataJSON: new Uint8Array([4, 5]).buffer,
        attestationObject: new Uint8Array([6, 7]).buffer,
      },
    });

    const result = await createPasskeyCredential(mockChallenge);

    expect(result.credentialId).toBeTruthy();
    expect(result.clientDataJSON).toBeTruthy();
    expect(result.attestationObject).toBeTruthy();
  });

  it('throws PASSKEY_NOT_AVAILABLE when credential is null', async () => {
    mocks.mockCreate.mockResolvedValueOnce(null);

    await expect(createPasskeyCredential(mockChallenge)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_NOT_AVAILABLE,
    });
  });

  it('throws PASSKEY_CANCELLED on NotAllowedError', async () => {
    const error = new DOMException('User cancelled', 'NotAllowedError');
    mocks.mockCreate.mockRejectedValueOnce(error);

    await expect(createPasskeyCredential(mockChallenge)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_CANCELLED,
    });
  });
});

describe('getPasskeyAssertion', () => {
  let mocks: ReturnType<typeof mockCredentialsApi>;

  beforeEach(() => {
    mocks = mockCredentialsApi();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns assertion data on success', async () => {
    mocks.mockGet.mockResolvedValueOnce({
      rawId: new Uint8Array([1]).buffer,
      response: {
        clientDataJSON: new Uint8Array([2]).buffer,
        authenticatorData: new Uint8Array([3]).buffer,
        signature: new Uint8Array([4]).buffer,
        userHandle: new Uint8Array([5]).buffer,
      },
    });

    const result = await getPasskeyAssertion(mockActionChallenge);

    expect(result.credentialId).toBeTruthy();
    expect(result.clientDataJSON).toBeTruthy();
    expect(result.authenticatorData).toBeTruthy();
    expect(result.signature).toBeTruthy();
  });

  it('returns null userHandle when authenticator omits it', async () => {
    mocks.mockGet.mockResolvedValueOnce({
      rawId: new Uint8Array([1]).buffer,
      response: {
        clientDataJSON: new Uint8Array([2]).buffer,
        authenticatorData: new Uint8Array([3]).buffer,
        signature: new Uint8Array([4]).buffer,
        userHandle: null,
      },
    });

    const result = await getPasskeyAssertion(mockActionChallenge);
    expect(result.userHandle).toBeNull();
  });

  it('throws PASSKEY_NOT_AVAILABLE when credential is null', async () => {
    mocks.mockGet.mockResolvedValueOnce(null);

    await expect(getPasskeyAssertion(mockActionChallenge)).rejects.toMatchObject({
      code: IdentityErrorCode.PASSKEY_NOT_AVAILABLE,
    });
  });
});
