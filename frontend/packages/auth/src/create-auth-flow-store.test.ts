import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdentityClient } from '@ion/identity-client';
import { createAuthFlowStore } from './create-auth-flow-store';
import type { AuthFlowStore } from './auth-flow-store-types';

vi.mock('@ion/identity-client', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as Record<string, unknown>), isPasskeyAvailable: () => true };
});

vi.mock('@ion/auth-ui', () => ({
  isValidIdentityKeyName: (v: string) => /^[a-z0-9._-]+$/.test(v) && v.length > 0 && v.length <= 64,
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock('@ion/localization', () => ({
  translate: (key: string) => key,
}));

function createMockIdentityClient(): IdentityClient {
  return {
    loginWithPasskey: vi.fn().mockResolvedValue(undefined),
    loginWithPassword: vi.fn().mockResolvedValue(undefined),
    registerWithPasskey: vi.fn().mockResolvedValue(undefined),
    registerWithPassword: vi.fn().mockResolvedValue(undefined),
    getLoginCapabilities: vi.fn().mockResolvedValue({ identityFound: true, supportsPasskey: true, supportsPassword: true, twoFAOptionsCount: null }),
    logout: vi.fn().mockResolvedValue(undefined),
    recoverAccount: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn().mockResolvedValue(false),
    restoreAuth: vi.fn().mockResolvedValue(undefined),
    refreshToken: vi.fn().mockResolvedValue(undefined),
    listCredentials: vi.fn().mockResolvedValue([]),
    createRecoveryCredentials: vi.fn().mockResolvedValue({ credentials: [] }),
    requestTwoFACode: vi.fn().mockResolvedValue({}),
    verifyTwoFACode: vi.fn().mockResolvedValue(undefined),
    deleteTwoFAMethod: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    getUser: vi.fn().mockResolvedValue(null),
    getSocialProfile: vi.fn().mockResolvedValue(null),
    updateSocialProfile: vi.fn().mockResolvedValue({}),
    verifyNickname: vi.fn().mockResolvedValue(undefined),
    authStore: { getSnapshot: () => [], subscribe: () => () => {} },
  } as unknown as IdentityClient;
}

describe('createAuthFlowStore', () => {
  let client: IdentityClient;
  let onAuthSuccess: ReturnType<typeof vi.fn>;
  let store: AuthFlowStore;

  beforeEach(() => {
    client = createMockIdentityClient();
    onAuthSuccess = vi.fn();
    store = createAuthFlowStore({ identityClient: client, onAuthSuccess });
  });

  it('initializes with get-started phase and idle operations', () => {
    const state = store.getSnapshot();
    expect(state.phase).toBe('get-started');
    expect(state.identityKeyName).toBe('');
    expect(state.operations.loginAttempt.status).toBe('idle');
    expect(state.operations.register.status).toBe('idle');
  });

  it('notifies listeners on state change', () => {
    const listener = vi.fn();
    store.subscribe(listener);
    store.navigateTo('register');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes correctly', () => {
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    unsub();
    store.navigateTo('register');
    expect(listener).not.toHaveBeenCalled();
  });

  describe('attemptLogin', () => {
    it('sets loginAttempt to success and calls onAuthSuccess on passkey login', async () => {
      await store.attemptLogin('testuser');
      const state = store.getSnapshot();
      expect(state.operations.loginAttempt.status).toBe('success');
      expect(onAuthSuccess).toHaveBeenCalledWith('testuser');
    });

    it('transitions to verify-password when passkey not supported', async () => {
      vi.mocked(client.getLoginCapabilities).mockResolvedValue({
        identityFound: true, supportsPasskey: false, supportsPassword: true, twoFAOptionsCount: null,
      });
      await store.attemptLogin('testuser');
      const state = store.getSnapshot();
      expect(state.phase).toBe('verify-password');
      expect(state.identityKeyName).toBe('testuser');
      expect(state.operations.loginAttempt.status).toBe('idle');
    });

    it('sets error when user not found', async () => {
      vi.mocked(client.getLoginCapabilities).mockResolvedValue({
        identityFound: false, supportsPasskey: false, supportsPassword: false, twoFAOptionsCount: null,
      });
      await store.attemptLogin('unknown');
      const state = store.getSnapshot();
      expect(state.operations.loginAttempt.status).toBe('error');
      expect(state.operations.loginAttempt.error).not.toBeNull();
    });

    it('skips when already loading', async () => {
      const slow = new Promise(() => {});
      vi.mocked(client.getLoginCapabilities).mockReturnValue(slow as never);
      store.attemptLogin('user1');
      const state = store.getSnapshot();
      expect(state.operations.loginAttempt.status).toBe('loading');
      await store.attemptLogin('user2');
      expect(client.getLoginCapabilities).toHaveBeenCalledTimes(1);
    });
  });

  describe('register', () => {
    it('sets register to success on password registration', async () => {
      await store.register({ identityKeyName: 'newuser', password: 'pass123' });
      const state = store.getSnapshot();
      expect(state.operations.register.status).toBe('success');
      expect(onAuthSuccess).toHaveBeenCalledWith('newuser');
    });
  });

  describe('loginWithPassword', () => {
    it('sets passwordLogin to success', async () => {
      await store.loginWithPassword('user', 'pass');
      const state = store.getSnapshot();
      expect(state.operations.passwordLogin.status).toBe('success');
      expect(onAuthSuccess).toHaveBeenCalledWith('user');
    });
  });

  describe('navigation', () => {
    it('navigates to valid phase', () => {
      store.navigateTo('register');
      expect(store.getSnapshot().phase).toBe('register');
    });

    it('rejects invalid transition', () => {
      store.navigateTo('register');
      store.navigateTo('restore-credentials');
      expect(store.getSnapshot().phase).toBe('register');
    });

    it('goBack returns to previous phase', () => {
      store.navigateTo('register');
      store.goBack();
      expect(store.getSnapshot().phase).toBe('get-started');
    });

    it('reset restores initial state', () => {
      store.navigateTo('register');
      store.reset();
      expect(store.getSnapshot().phase).toBe('get-started');
    });
  });

  describe('modals', () => {
    it('dismissRestoreSuccess clears visibility', async () => {
      store.navigateTo('restore-menu');
      store.navigateTo('restore-credentials');
      await store.restoreCredentials({ identityKeyName: 'u', recoveryKeyId: 'k', recoveryCode: 'c' });
      store.dismissRestoreSuccess();
      expect(store.getSnapshot().isRestoreSuccessVisible).toBe(false);
    });
  });

  describe('clearError', () => {
    it('resets operation to idle', async () => {
      vi.mocked(client.getLoginCapabilities).mockResolvedValue({
        identityFound: false, supportsPasskey: false, supportsPassword: false, twoFAOptionsCount: null,
      });
      await store.attemptLogin('unknown');
      expect(store.getSnapshot().operations.loginAttempt.status).toBe('error');
      store.clearError('loginAttempt');
      expect(store.getSnapshot().operations.loginAttempt.status).toBe('idle');
    });
  });
});
