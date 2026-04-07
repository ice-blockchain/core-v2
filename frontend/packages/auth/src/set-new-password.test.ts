import { describe, it, expect, vi } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { setNewPassword } from './set-new-password';

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

describe('setNewPassword', () => {
  it('returns restored on success', async () => {
    const client = createMockClient();
    const result = await setNewPassword(client, recoveryData, 'newpass');
    expect(result).toEqual({ outcome: 'restored' });
    expect(client.recoverAccount).toHaveBeenCalledWith({
      username: 'user1',
      recoveryCode: 'code1',
      credentialId: 'key1',
      newCredentialKind: 'PasswordProtectedKey',
      newPassword: 'newpass',
    });
  });

  it('returns invalid-credentials when recovery credentials are invalid', async () => {
    const client = createMockClient();
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS, 'invalid'),
    );
    const result = await setNewPassword(client, recoveryData, 'newpass');
    expect(result).toEqual({ outcome: 'invalid-credentials' });
  });

  it('returns error on unknown failure', async () => {
    const client = createMockClient();
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.SERVER_ERROR, 'server error'),
    );
    const result = await setNewPassword(client, recoveryData, 'newpass');
    expect(result.outcome).toBe('error');
    if (result.outcome === 'error') {
      expect(result.error.userMessage).toBeDefined();
    }
  });
});
