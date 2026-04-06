import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode, isPasskeyAvailable } from '@ion/identity-client';
import { handleRestoreCredentialsSubmit, handleRestoreCredentials, handleSetNewPassword } from './handle-credential-restore';
import type { AuthFlowAction } from './types';

vi.mock('@ion/identity-client', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as Record<string, unknown>), isPasskeyAvailable: vi.fn(() => true) };
});

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

describe('handleRestoreCredentialsSubmit', () => {
  it('dispatches GO_TO_SET_NEW_PASSWORD with correct data', () => {
    const dispatch = vi.fn();
    handleRestoreCredentialsSubmit(dispatch, RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'GO_TO_SET_NEW_PASSWORD',
      identityKeyName: 'alice',
      recoveryKeyId: 'key-1',
      recoveryCode: 'code-1',
    });
  });
});

describe('handleRestoreCredentials', () => {
  let client: IdentityClient;
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = createMockClient();
    dispatch = vi.fn();
    vi.mocked(isPasskeyAvailable).mockReturnValue(true);
  });

  it('attempts passkey recovery when passkey is available', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    expect(client.recoverAccount).toHaveBeenCalledWith({
      username: 'alice',
      recoveryCode: 'code-1',
      credentialId: 'key-1',
      newCredentialKind: 'Fido2',
    });
  });

  it('dispatches SHOW_RESTORE_SUCCESS on passkey recovery success', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_RESTORE_SUCCESS' });
  });

  it('falls back to password screen on PASSKEY_CANCELLED', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'cancelled'),
    );
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'GO_TO_SET_NEW_PASSWORD' }));
  });

  it('falls back to password screen on PASSKEY_NOT_AVAILABLE', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'not available'),
    );
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'GO_TO_SET_NEW_PASSWORD' }));
  });

  it('dispatches SHOW_IDENTITY_KEY_NOT_FOUND on INVALID_RECOVERY_CREDENTIALS', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS, 'bad creds'),
    );
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'GO_TO_SET_NEW_PASSWORD' }));
  });

  it('dispatches SHOW_IDENTITY_KEY_NOT_FOUND on USER_NOT_FOUND', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.USER_NOT_FOUND, 'not found'),
    );
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'GO_TO_SET_NEW_PASSWORD' }));
  });

  it('dispatches SET_ERROR on server error without fallback', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'offline'),
    );
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.NETWORK_ERROR }),
    }));
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'GO_TO_SET_NEW_PASSWORD' }));
  });

  it('goes straight to password screen when passkey not available', async () => {
    vi.mocked(isPasskeyAvailable).mockReturnValue(false);
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    expect(client.recoverAccount).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'GO_TO_SET_NEW_PASSWORD' }));
  });

  it('toggles loading true then false on success', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    const loadingCalls = dispatch.mock.calls.filter(
      (call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING',
    );
    expect(loadingCalls[0]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: true });
    expect(loadingCalls[loadingCalls.length - 1]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });

  it('resets loading to false on error', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(new Error('fail'));
    await handleRestoreCredentials({ identityClient: client, dispatch }, RECOVERY_DATA);
    const lastLoadingCall = dispatch.mock.calls
      .filter((call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING')
      .pop();
    expect(lastLoadingCall?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });
});

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
