import { describe, it, expect, vi } from 'vitest';
import type { LoginDataSource } from '../data-sources/login-data-source';
import { getLoginCapabilities } from './login-capabilities';

vi.mock('../passkey', () => ({
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
    });
  });

  it('reports password only when no webauthn credentials', async () => {
    const ds = createMockLoginDataSource(false, true);
    const caps = await getLoginCapabilities('alice', ds);
    expect(caps.supportsPasskey).toBe(false);
    expect(caps.supportsPassword).toBe(true);
    expect(caps.identityFound).toBe(true);
  });

  it('reports identity not found when init fails', async () => {
    const ds: LoginDataSource = {
      initLogin: vi.fn(() => Promise.reject(new Error('not found'))),
      completeLogin: vi.fn(),
    };
    const caps = await getLoginCapabilities('unknown', ds);
    expect(caps).toEqual({
      supportsPasskey: false,
      supportsPassword: false,
      identityFound: false,
    });
  });
});
