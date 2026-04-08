import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { handleRegister } from './handle-register';
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
    listWallets: vi.fn(),
    getWalletAssets: vi.fn(),
    getWalletNfts: vi.fn(),
    createWallet: vi.fn(),
    probeRestrictedRegion: vi.fn(),
    getWalletHistory: vi.fn(),
    getWalletTransfers: vi.fn(),
    getTransferById: vi.fn(),
    makeTransfer: vi.fn(),
    listWalletViews: vi.fn(),
    createWalletView: vi.fn(),
    getWalletView: vi.fn(),
    updateWalletView: vi.fn(),
    deleteWalletView: vi.fn(),
    signAndBroadcastEvm: vi.fn(),
    generateSignature: vi.fn(),
    callFunction: vi.fn(),
    signMessageTon: vi.fn(),
    getCoins: vi.fn(),
    syncCoins: vi.fn(),
    getCoinsBySymbolGroup: vi.fn(),
    getCoinData: vi.fn(),
    searchCoins: vi.fn(),
    getEstimateFees: vi.fn(),
    listKeys: vi.fn(),
    createKey: vi.fn(),
    deriveKey: vi.fn(),
    updateKey: vi.fn(),
    authStore: { getSnapshot: () => [] as readonly string[], subscribe: () => () => {} },
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

  it('falls back to register screen when passkey registration is cancelled', async () => {
    vi.mocked(client.registerWithPasskey).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'cancelled'),
    );
    await handleRegister(deps(), { identityKeyName: 'frank' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_REGISTER' });
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({
      type: 'SET_ERROR',
    }));
    expect(onAuthSuccess).not.toHaveBeenCalled();
  });

  it('falls back to register screen when passkey is not available', async () => {
    vi.mocked(client.registerWithPasskey).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_NOT_AVAILABLE, 'unavailable'),
    );
    await handleRegister(deps(), { identityKeyName: 'grace' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'GO_TO_REGISTER' });
  });

  it('rejects invalid identity key names without calling the API', async () => {
    await handleRegister(deps(), { identityKeyName: 'Alice', password: 'P@ss1234' });
    expect(client.registerWithPassword).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ERROR' }));
  });

  it('rejects identity key names with spaces or special characters', async () => {
    await handleRegister(deps(), { identityKeyName: 'alice bob', password: 'P@ss1234' });
    expect(client.registerWithPassword).not.toHaveBeenCalled();

    await handleRegister(deps(), { identityKeyName: "'; DROP TABLE users;--", password: 'P@ss1234' });
    expect(client.registerWithPassword).not.toHaveBeenCalled();
  });

  it('rejects empty identity key name', async () => {
    await handleRegister(deps(), { identityKeyName: '', password: 'P@ss1234' });
    expect(client.registerWithPassword).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ERROR' }));
  });
});
