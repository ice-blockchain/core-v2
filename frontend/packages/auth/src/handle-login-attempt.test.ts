import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { handleLoginAttempt } from './handle-login-attempt';
import type { AuthFlowAction } from './types';

vi.mock('@ion/auth-ui', () => ({
  isValidIdentityKeyName: (v: string) => /^[a-z0-9._-]+$/.test(v) && v.length > 0 && v.length <= 64,
}));

function createMockClient(): IdentityClient {
  return {
    getLoginCapabilities: vi.fn(),
    loginWithPasskey: vi.fn(),
    loginWithPassword: vi.fn(),
    registerWithPassword: vi.fn(),
    registerWithPasskey: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    isAuthenticated: vi.fn(),
    restoreAuth: vi.fn(),
    getUser: vi.fn(),
    verifyEarlyAccessEmail: vi.fn(),
    listCredentials: vi.fn(),
    createRecoveryCredentials: vi.fn(),
    requestTwoFACode: vi.fn(),
    verifyTwoFACode: vi.fn(),
    deleteTwoFAMethod: vi.fn(),
    deleteAccount: vi.fn(),
    recoverAccount: vi.fn(),
    getSocialProfile: vi.fn(),
    updateSocialProfile: vi.fn(),
    verifyNickname: vi.fn(),
    getIonConnectRelays: vi.fn(),
    getIonConnectIndexers: vi.fn(),
    setIonConnectRelays: vi.fn(),
    getAvailableRelays: vi.fn(),
    getContentCreators: vi.fn(),
    searchUsers: vi.fn(),
    authStore: { getSnapshot: () => [] as readonly string[], subscribe: () => () => {} },
  };
}

describe('handleLoginAttempt', () => {
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

  it('sets error when identity is not found', async () => {
    vi.mocked(client.getLoginCapabilities).mockResolvedValue({
      identityFound: false, supportsPasskey: false, supportsPassword: false, twoFAOptionsCount: null,
    });
    await handleLoginAttempt(deps(), 'alice');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LOADING', isLoading: true });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.USER_NOT_FOUND }),
    }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LOADING', isLoading: false });
    expect(onAuthSuccess).not.toHaveBeenCalled();
  });

  it('navigates to verify-passkey and calls onAuthSuccess on passkey login', async () => {
    vi.mocked(client.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: true, supportsPassword: false, twoFAOptionsCount: null,
    });
    vi.mocked(client.loginWithPasskey).mockResolvedValue('token');
    await handleLoginAttempt(deps(), 'bob');
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_VERIFY_PASSKEY', identityKeyName: 'bob' });
    expect(onAuthSuccess).toHaveBeenCalledWith('bob');
  });

  it('falls back to verify-password when passkey is cancelled and password is supported', async () => {
    vi.mocked(client.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: true, supportsPassword: true, twoFAOptionsCount: null,
    });
    vi.mocked(client.loginWithPasskey).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'cancelled'),
    );
    await handleLoginAttempt(deps(), 'carol');
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_VERIFY_PASSKEY', identityKeyName: 'carol' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_VERIFY_PASSWORD', identityKeyName: 'carol' });
    expect(onAuthSuccess).not.toHaveBeenCalled();
  });

  it('falls back to verify-password when passkey is not available and password is supported', async () => {
    vi.mocked(client.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: true, supportsPassword: true, twoFAOptionsCount: null,
    });
    vi.mocked(client.loginWithPasskey).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'unavailable'),
    );
    await handleLoginAttempt(deps(), 'dave');
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_VERIFY_PASSWORD', identityKeyName: 'dave' });
  });

  it('shows error when passkey is cancelled and password is not supported', async () => {
    vi.mocked(client.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: true, supportsPassword: false, twoFAOptionsCount: null,
    });
    vi.mocked(client.loginWithPasskey).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'cancelled'),
    );
    await handleLoginAttempt(deps(), 'eve');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.PASSKEY_CANCELLED }),
    }));
  });

  it('navigates directly to verify-password when only password is supported', async () => {
    vi.mocked(client.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: false, supportsPassword: true, twoFAOptionsCount: null,
    });
    await handleLoginAttempt(deps(), 'frank');
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_VERIFY_PASSWORD', identityKeyName: 'frank' });
    expect(client.loginWithPasskey).not.toHaveBeenCalled();
  });

  it('sets error when getLoginCapabilities throws', async () => {
    vi.mocked(client.getLoginCapabilities).mockRejectedValue(
      new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'offline'),
    );
    await handleLoginAttempt(deps(), 'grace');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.NETWORK_ERROR }),
    }));
  });

  it('toggles loading state in all paths', async () => {
    vi.mocked(client.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: false, supportsPassword: true, twoFAOptionsCount: null,
    });
    await handleLoginAttempt(deps(), 'heidi');
    const loadingCalls = dispatch.mock.calls.filter(
      (call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING',
    );
    expect(loadingCalls[0]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: true });
    expect(loadingCalls[loadingCalls.length - 1]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });

  it('rejects identity key names with uppercase characters', async () => {
    await handleLoginAttempt(deps(), 'Alice');
    expect(client.getLoginCapabilities).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ERROR' }));
  });

  it('rejects identity key names with spaces', async () => {
    await handleLoginAttempt(deps(), 'alice bob');
    expect(client.getLoginCapabilities).not.toHaveBeenCalled();
  });

  it('rejects SQL injection strings', async () => {
    await handleLoginAttempt(deps(), "'; DROP TABLE users;--");
    expect(client.getLoginCapabilities).not.toHaveBeenCalled();
  });

  it('rejects empty identity key name', async () => {
    await handleLoginAttempt(deps(), '');
    expect(client.getLoginCapabilities).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ERROR' }));
  });

  it('rejects unicode characters in identity key name', async () => {
    await handleLoginAttempt(deps(), '\u0430lice');
    expect(client.getLoginCapabilities).not.toHaveBeenCalled();
  });
});
