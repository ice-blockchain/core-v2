import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { handlePasswordLogin } from './handle-password-login';
import type { AuthFlowAction } from './types';

function buildIdentityStub(): Record<string, ReturnType<typeof vi.fn>> {
  const methods = [
    'getLoginCapabilities', 'loginWithPasskey', 'loginWithPassword',
    'registerWithPassword', 'registerWithPasskey', 'logout', 'refreshToken',
    'isAuthenticated', 'restoreAuth', 'getUser', 'verifyEarlyAccessEmail',
    'listCredentials', 'createRecoveryCredentials', 'requestTwoFACode',
    'verifyTwoFACode', 'deleteTwoFAMethod', 'deleteAccount', 'recoverAccount',
    'getSocialProfile', 'updateSocialProfile', 'verifyNickname',
    'getIonConnectRelays', 'getIonConnectIndexers', 'setIonConnectRelays',
    'getAvailableRelays', 'getContentCreators', 'searchUsers',
  ] as const;
  return Object.fromEntries(methods.map((m) => [m, vi.fn()]));
}

function createMockClient(): IdentityClient {
  return {
    ...buildIdentityStub(),
    authStore: { getSnapshot: () => [] as readonly string[], subscribe: () => () => {} },
  } as unknown as IdentityClient;
}

describe('handlePasswordLogin', () => {
  let client: IdentityClient;
  let dispatch: ReturnType<typeof vi.fn>;
  let onAuthSuccess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = createMockClient();
    dispatch = vi.fn();
    onAuthSuccess = vi.fn();
  });

  function deps() {
    return { identityClient: client, dispatch, onAuthSuccess };
  }

  it('calls onAuthSuccess on successful password login', async () => {
    vi.mocked(client.loginWithPassword).mockResolvedValue('token');
    await handlePasswordLogin(deps(), 'alice', 'P@ss1234');
    expect(client.loginWithPassword).toHaveBeenCalledWith({ username: 'alice', password: 'P@ss1234' });
    expect(onAuthSuccess).toHaveBeenCalledWith('alice');
  });

  it('sets error on invalid credentials', async () => {
    vi.mocked(client.loginWithPassword).mockRejectedValue(
      new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'wrong password'),
    );
    await handlePasswordLogin(deps(), 'bob', 'wrong');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.INVALID_CREDENTIALS }),
    }));
    expect(onAuthSuccess).not.toHaveBeenCalled();
  });

  it('toggles loading true then false', async () => {
    vi.mocked(client.loginWithPassword).mockResolvedValue('token');
    await handlePasswordLogin(deps(), 'carol', 'P@ss1234');
    const loadingCalls = dispatch.mock.calls.filter(
      (call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING',
    );
    expect(loadingCalls[0]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: true });
    expect(loadingCalls[loadingCalls.length - 1]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });

  it('maps network errors to SET_ERROR', async () => {
    vi.mocked(client.loginWithPassword).mockRejectedValue(
      new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'offline'),
    );
    await handlePasswordLogin(deps(), 'dave', 'pass');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.NETWORK_ERROR }),
    }));
  });

  it('maps unknown errors to UNKNOWN code', async () => {
    vi.mocked(client.loginWithPassword).mockRejectedValue(new Error('unexpected'));
    await handlePasswordLogin(deps(), 'eve', 'pass');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: 'UNKNOWN' }),
    }));
  });

  it('resets loading to false on error', async () => {
    vi.mocked(client.loginWithPassword).mockRejectedValue(new Error('fail'));
    await handlePasswordLogin(deps(), 'frank', 'pass');
    const lastLoadingCall = dispatch.mock.calls
      .filter((call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING')
      .pop();
    expect(lastLoadingCall?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });
});
