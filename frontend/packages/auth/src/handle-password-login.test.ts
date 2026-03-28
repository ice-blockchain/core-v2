import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { handlePasswordLogin } from './handle-password-login';
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
});
