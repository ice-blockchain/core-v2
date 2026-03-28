import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { handleRegister } from './handle-register';
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

describe('handleRegister', () => {
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

  it('calls onAuthSuccess on successful registration', async () => {
    vi.mocked(client.registerWithPassword).mockResolvedValue(undefined);
    await handleRegister(deps(), { identityKeyName: 'alice', password: 'StrongP@ss1' });
    expect(client.registerWithPassword).toHaveBeenCalledWith({
      username: 'alice', password: 'StrongP@ss1',
    });
    expect(onAuthSuccess).toHaveBeenCalledWith('alice');
  });

  it('sets error when user already exists', async () => {
    vi.mocked(client.registerWithPassword).mockRejectedValue(
      new IdentityError(IdentityErrorCode.USER_ALREADY_EXISTS, 'exists'),
    );
    await handleRegister(deps(), { identityKeyName: 'bob', password: 'P@ss1234' });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.USER_ALREADY_EXISTS }),
    }));
    expect(onAuthSuccess).not.toHaveBeenCalled();
  });

  it('sets error on network failure', async () => {
    vi.mocked(client.registerWithPassword).mockRejectedValue(
      new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'offline'),
    );
    await handleRegister(deps(), { identityKeyName: 'carol', password: 'P@ss1234' });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: IdentityErrorCode.NETWORK_ERROR }),
    }));
  });

  it('maps unknown error to UNKNOWN code', async () => {
    vi.mocked(client.registerWithPassword).mockRejectedValue(new Error('unexpected'));
    await handleRegister(deps(), { identityKeyName: 'dave', password: 'P@ss1234' });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
      error: expect.objectContaining({ code: 'UNKNOWN' }),
    }));
  });

  it('toggles loading true then false', async () => {
    vi.mocked(client.registerWithPassword).mockResolvedValue(undefined);
    await handleRegister(deps(), { identityKeyName: 'eve', password: 'P@ss1234' });
    const loadingCalls = dispatch.mock.calls.filter(
      (call: unknown[]) => (call[0] as AuthFlowAction).type === 'SET_LOADING',
    );
    expect(loadingCalls[0]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: true });
    expect(loadingCalls[loadingCalls.length - 1]?.[0]).toEqual({ type: 'SET_LOADING', isLoading: false });
  });
});
