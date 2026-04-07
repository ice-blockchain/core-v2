import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { handleSetNewPassword } from './handle-set-new-password';
import type { AuthFlowAction } from './types';

function buildIdentityStub(): Record<string, ReturnType<typeof vi.fn>> {
  const methods = [
    'getLoginCapabilities', 'loginWithPasskey', 'loginWithPassword',
    'registerWithPassword', 'registerWithPasskey', 'logout', 'refreshToken',
    'isAuthenticated', 'restoreAuth', 'getUser', 'verifyEarlyAccessEmail',
    'listCredentials', 'createRecoveryCredentials', 'requestTwoFACode',
    'verifyTwoFACode', 'deleteTwoFAMethod', 'deleteAccount', 'recoverAccount',
    'getSocialProfile', 'updateSocialProfile', 'verifyNickname',
  ] as const;
  return Object.fromEntries(methods.map((m) => [m, vi.fn()]));
}

function createMockClient(): IdentityClient {
  return {
    ...buildIdentityStub(),
    authStore: { getSnapshot: () => [] as readonly string[], subscribe: () => () => {} },
  } as unknown as IdentityClient;
}

const RECOVERY_DATA = { identityKeyName: 'alice', recoveryKeyId: 'key-1', recoveryCode: 'code-1' };

describe('handleSetNewPassword', () => {
  let client: IdentityClient;
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = createMockClient();
    dispatch = vi.fn();
  });

  it('calls recoverAccount with correctly mapped input', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleSetNewPassword({ identityClient: client, dispatch, recoveryData: RECOVERY_DATA }, 'NewP@ss1');
    expect(client.recoverAccount).toHaveBeenCalledWith({
      username: 'alice',
      recoveryCode: 'code-1',
      credentialId: 'key-1',
      newCredentialKind: 'PasswordProtectedKey',
      newPassword: 'NewP@ss1',
    });
  });

  it('dispatches SHOW_RESTORE_SUCCESS on success', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleSetNewPassword({ identityClient: client, dispatch, recoveryData: RECOVERY_DATA }, 'NewP@ss1');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_RESTORE_SUCCESS' });
  });

  it('dispatches SHOW_IDENTITY_KEY_NOT_FOUND on INVALID_RECOVERY_CREDENTIALS', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS, 'bad creds'),
    );
    await handleSetNewPassword({ identityClient: client, dispatch, recoveryData: RECOVERY_DATA }, 'NewP@ss1');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
  });

  it('dispatches SHOW_IDENTITY_KEY_NOT_FOUND on USER_NOT_FOUND', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.USER_NOT_FOUND, 'not found'),
    );
    await handleSetNewPassword({ identityClient: client, dispatch, recoveryData: RECOVERY_DATA }, 'NewP@ss1');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
  });

  it('dispatches SET_ERROR on network error', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'offline'),
    );
    await handleSetNewPassword({ identityClient: client, dispatch, recoveryData: RECOVERY_DATA }, 'NewP@ss1');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.NETWORK_ERROR }),
    }));
  });

  it('maps unknown errors to UNKNOWN code', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(new Error('unexpected'));
    await handleSetNewPassword({ identityClient: client, dispatch, recoveryData: RECOVERY_DATA }, 'NewP@ss1');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: 'UNKNOWN' }),
    }));
  });

  it('toggles loading true then false', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleSetNewPassword({ identityClient: client, dispatch, recoveryData: RECOVERY_DATA }, 'NewP@ss1');
    const loadingCalls = dispatch.mock.calls.filter(
      (call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING',
    );
    expect(loadingCalls[0]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: true });
    expect(loadingCalls[loadingCalls.length - 1]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });

  it('resets loading to false on error', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(new Error('fail'));
    await handleSetNewPassword({ identityClient: client, dispatch, recoveryData: RECOVERY_DATA }, 'NewP@ss1');
    const lastLoadingCall = dispatch.mock.calls
      .filter((call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING')
      .pop();
    expect(lastLoadingCall?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });
});
