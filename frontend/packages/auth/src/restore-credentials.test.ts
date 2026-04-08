import { describe, it, expect, vi } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { restoreCredentials } from './restore-credentials';

vi.mock('@ion/identity-client', () => ({
  isPasskeyAvailable: () => true,
  IdentityError: class IdentityError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  IdentityErrorCode: {
    PASSKEY_CANCELLED: 'PASSKEY_CANCELLED',
    PASSKEY_NOT_AVAILABLE: 'PASSKEY_NOT_AVAILABLE',
    INVALID_RECOVERY_CREDENTIALS: 'INVALID_RECOVERY_CREDENTIALS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    SERVER_ERROR: 'SERVER_ERROR',
    UNKNOWN: 'UNKNOWN',
  },
  mapNetworkError: (error: unknown) => ({
    code: 'NETWORK_ERROR',
    message: error instanceof Error ? error.message : String(error),
  }),
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@ion/localization', () => ({
  translate: (key: string) => key,
}));

function createMockClient(): IdentityClient {
  return {
    recoverAccount: vi.fn().mockResolvedValue(undefined),
  } as unknown as IdentityClient;
}

const recoveryData = { identityKeyName: 'user1', recoveryKeyId: 'key1', recoveryCode: 'code1' };

describe('restoreCredentials', () => {
  it('returns restored on successful passkey recovery', async () => {
    const client = createMockClient();
    const result = await restoreCredentials(client, recoveryData);
    expect(result).toEqual({ outcome: 'restored' });
  });

  it('returns needs-password when passkey cancelled', async () => {
    const client = createMockClient();
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'cancelled'),
    );
    const result = await restoreCredentials(client, recoveryData);
    expect(result.outcome).toBe('needs-password');
  });

  it('returns invalid-credentials on invalid recovery credentials', async () => {
    const client = createMockClient();
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS, 'invalid'),
    );
    const result = await restoreCredentials(client, recoveryData);
    expect(result).toEqual({ outcome: 'invalid-credentials' });
  });

  it('returns error on unknown failure', async () => {
    const client = createMockClient();
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.SERVER_ERROR, 'server error'),
    );
    const result = await restoreCredentials(client, recoveryData);
    expect(result.outcome).toBe('error');
    if (result.outcome === 'error') {
      expect(result.error.userMessage).toBeDefined();
    }
  });
});
