import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode, isPasskeyAvailable } from '@ion/identity-client';
import { handleRestoreCredentials } from './handle-restore-credentials';
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

describe('handleRestoreCredentials', () => {
  let client: IdentityClient;
  let dispatch: ReturnType<typeof vi.fn>;
  let onRecoveryData: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = createMockClient();
    dispatch = vi.fn();
    onRecoveryData = vi.fn();
    vi.mocked(isPasskeyAvailable).mockReturnValue(true);
  });

  function input() {
    return { identityClient: client, dispatch, onRecoveryData };
  }

  it('calls onRecoveryData with the provided data', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    expect(onRecoveryData).toHaveBeenCalledWith(RECOVERY_DATA);
  });

  it('attempts passkey recovery when passkey is available', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    expect(client.recoverAccount).toHaveBeenCalledWith({
      username: 'alice',
      recoveryCode: 'code-1',
      credentialId: 'key-1',
      newCredentialKind: 'Fido2',
    });
  });

  it('dispatches SHOW_RESTORE_SUCCESS on passkey recovery success', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_RESTORE_SUCCESS' });
  });

  it('falls back to password screen on PASSKEY_CANCELLED', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'cancelled'),
    );
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_SET_NEW_PASSWORD', identityKeyName: 'alice' });
  });

  it('falls back to password screen on PASSKEY_NOT_AVAILABLE', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'not available'),
    );
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_SET_NEW_PASSWORD', identityKeyName: 'alice' });
  });

  it('dispatches SHOW_IDENTITY_KEY_NOT_FOUND on INVALID_RECOVERY_CREDENTIALS', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS, 'bad creds'),
    );
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'GO_TO_SET_NEW_PASSWORD' });
  });

  it('dispatches SHOW_IDENTITY_KEY_NOT_FOUND on USER_NOT_FOUND', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.USER_NOT_FOUND, 'not found'),
    );
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SHOW_IDENTITY_KEY_NOT_FOUND' });
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'GO_TO_SET_NEW_PASSWORD' });
  });

  it('dispatches SET_ERROR on server error without fallback', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'offline'),
    );
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.NETWORK_ERROR }),
    }));
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'GO_TO_SET_NEW_PASSWORD' });
  });

  it('goes straight to password screen when passkey not available', async () => {
    vi.mocked(isPasskeyAvailable).mockReturnValue(false);
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    expect(client.recoverAccount).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_SET_NEW_PASSWORD', identityKeyName: 'alice' });
  });

  it('toggles loading true then false on success', async () => {
    vi.mocked(client.recoverAccount).mockResolvedValue(undefined);
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    const loadingCalls = dispatch.mock.calls.filter(
      (call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING',
    );
    expect(loadingCalls[0]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: true });
    expect(loadingCalls[loadingCalls.length - 1]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });

  it('resets loading to false on error', async () => {
    vi.mocked(client.recoverAccount).mockRejectedValue(new Error('fail'));
    await handleRestoreCredentials(input(), RECOVERY_DATA);
    const lastLoadingCall = dispatch.mock.calls
      .filter((call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING')
      .pop();
    expect(lastLoadingCall?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });
});
