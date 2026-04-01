import { describe, it, expect, vi } from 'vitest';
import { NetworkError } from '@ion/network';
import type { LoginDataSource } from '../data-sources/login-data-source';
import { getLoginCapabilities } from './login-capabilities';

vi.mock('../platform/passkey', () => ({
  isPasskeyAvailable: vi.fn(() => true),
}));

function createMockLoginDataSource(
  webauthn: boolean,
  password: boolean,
): LoginDataSource {
  return {
    initLogin: vi.fn(() =>
      Promise.resolve({
        challenge: 'ch',
        challengeIdentifier: 'ci',
        rp: { id: 'example.com', name: 'Example' },
        allowCredentials: {
          webauthn: webauthn ? [{ type: 'public-key', id: 'w-1' }] : null,
          passwordProtectedKey: password ? [{ type: 'public-key', id: 'p-1' }] : null,
        },
        supportedCredentialKinds: [],
        attestation: 'direct',
        userVerification: 'preferred',
        externalAuthenticationUrl: '',
      }),
    ),
    completeLogin: vi.fn(),
  };
}

describe('getLoginCapabilities', () => {
  it('reports both passkey and password when available', async () => {
    const ds = createMockLoginDataSource(true, true);
    const caps = await getLoginCapabilities('alice', ds);
    expect(caps).toEqual({
      supportsPasskey: true,
      supportsPassword: true,
      identityFound: true,
      twoFAOptionsCount: null,
    });
  });

  it('reports password only when no webauthn credentials', async () => {
    const ds = createMockLoginDataSource(false, true);
    const caps = await getLoginCapabilities('alice', ds);
    expect(caps.supportsPasskey).toBe(false);
    expect(caps.supportsPassword).toBe(true);
    expect(caps.identityFound).toBe(true);
  });

  it('reports identity not found on 404', async () => {
    const ds: LoginDataSource = {
      initLogin: vi.fn(() => Promise.reject(
        new NetworkError({ code: 'CLIENT_ERROR', message: 'Not found', status: 404 }),
      )),
      completeLogin: vi.fn(),
    };
    const caps = await getLoginCapabilities('unknown', ds);
    expect(caps).toEqual({
      supportsPasskey: false,
      supportsPassword: false,
      identityFound: false,
      twoFAOptionsCount: null,
    });
  });

  it('reports identity not found on 401', async () => {
    const ds: LoginDataSource = {
      initLogin: vi.fn(() => Promise.reject(
        new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status: 401 }),
      )),
      completeLogin: vi.fn(),
    };
    const caps = await getLoginCapabilities('unknown', ds);
    expect(caps).toEqual({
      supportsPasskey: false,
      supportsPassword: false,
      identityFound: false,
      twoFAOptionsCount: null,
    });
  });

  it('returns twoFAOptionsCount from 403 response', async () => {
    const ds: LoginDataSource = {
      initLogin: vi.fn(() => Promise.reject(
        new NetworkError({ code: 'CLIENT_ERROR', message: 'Forbidden', status: 403, responseBody: { data: { n: 2 } } }),
      )),
      completeLogin: vi.fn(),
    };
    const caps = await getLoginCapabilities('alice', ds);
    expect(caps).toEqual({
      supportsPasskey: false,
      supportsPassword: false,
      identityFound: true,
      twoFAOptionsCount: 2,
    });
  });

  it('re-throws non-404 client errors', async () => {
    const badRequest = new NetworkError({ code: 'CLIENT_ERROR', message: 'Bad request', status: 400 });
    const ds: LoginDataSource = {
      initLogin: vi.fn(() => Promise.reject(badRequest)),
      completeLogin: vi.fn(),
    };
    await expect(getLoginCapabilities('alice', ds)).rejects.toBe(badRequest);
  });

  it('re-throws server errors instead of swallowing them', async () => {
    const serverError = new NetworkError({ code: 'SERVER_ERROR', message: 'Internal', status: 500 });
    const ds: LoginDataSource = {
      initLogin: vi.fn(() => Promise.reject(serverError)),
      completeLogin: vi.fn(),
    };
    await expect(getLoginCapabilities('alice', ds)).rejects.toBe(serverError);
  });

  it('re-throws non-network errors', async () => {
    const ds: LoginDataSource = {
      initLogin: vi.fn(() => Promise.reject(new TypeError('unexpected'))),
      completeLogin: vi.fn(),
    };
    await expect(getLoginCapabilities('alice', ds)).rejects.toThrow('unexpected');
  });
});
