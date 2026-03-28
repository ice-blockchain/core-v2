import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { handleLoginAttempt } from './handle-login-attempt';
import type { AuthFlowAction } from './types';

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
    getUser: vi.fn(),
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
      identityFound: false, supportsPasskey: false, supportsPassword: false,
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
      identityFound: true, supportsPasskey: true, supportsPassword: false,
    });
    vi.mocked(client.loginWithPasskey).mockResolvedValue('token');
    await handleLoginAttempt(deps(), 'bob');
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_VERIFY_PASSKEY', identityKeyName: 'bob' });
    expect(onAuthSuccess).toHaveBeenCalledWith('bob');
  });

  it('falls back to verify-password when passkey is cancelled and password is supported', async () => {
    vi.mocked(client.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: true, supportsPassword: true,
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
      identityFound: true, supportsPasskey: true, supportsPassword: true,
    });
    vi.mocked(client.loginWithPasskey).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'unavailable'),
    );
    await handleLoginAttempt(deps(), 'dave');
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_VERIFY_PASSWORD', identityKeyName: 'dave' });
  });

  it('shows error when passkey is cancelled and password is not supported', async () => {
    vi.mocked(client.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: true, supportsPassword: false,
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
      identityFound: true, supportsPasskey: false, supportsPassword: true,
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
      identityFound: true, supportsPasskey: false, supportsPassword: true,
    });
    await handleLoginAttempt(deps(), 'heidi');
    const loadingCalls = dispatch.mock.calls.filter(
      (call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING',
    );
    expect(loadingCalls[0]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: true });
    expect(loadingCalls[loadingCalls.length - 1]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });
});
