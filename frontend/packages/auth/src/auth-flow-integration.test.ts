import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import type { IdentityClient } from '@ion/identity-client';
import { useAuthFlow } from './use-auth-flow';
import type { AuthFlowConfig } from './types';
import type { ReactNode } from 'react';

vi.mock('@ion/identity-client', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as Record<string, unknown>), isPasskeyAvailable: () => false };
});

vi.mock('@ion/auth-ui', () => ({
  isValidIdentityKeyName: (v: string) => /^[a-z0-9._-]+$/.test(v) && v.length > 0 && v.length <= 64,
}));

const CLIENT_METHODS = [
  'getLoginCapabilities', 'loginWithPasskey', 'loginWithPassword', 'registerWithPassword',
  'registerWithPasskey', 'logout', 'refreshToken', 'isAuthenticated', 'restoreAuth', 'getUser',
  'verifyEarlyAccessEmail', 'listCredentials', 'createRecoveryCredentials', 'requestTwoFACode',
  'verifyTwoFACode', 'deleteTwoFAMethod', 'deleteAccount', 'recoverAccount',
  'getSocialProfile', 'updateSocialProfile', 'verifyNickname',
] as const;

function createMockClient(): IdentityClient {
  const stubs = Object.fromEntries(CLIENT_METHODS.map((m) => [m, vi.fn()]));
  return { ...stubs, authStore: { getSnapshot: () => [] as readonly string[], subscribe: () => () => {} } } as unknown as IdentityClient;
}

function createConfig(overrides?: Partial<AuthFlowConfig>): AuthFlowConfig {
  return {
    identityClient: createMockClient(),
    onAuthSuccess: vi.fn(),
    loadingElement: 'loading...' as unknown as ReactNode,
    ...overrides,
  };
}

const PASSWORD_CAPS = { identityFound: true, supportsPasskey: false, supportsPassword: true, twoFAOptionsCount: null };
const RECOVERY = { identityKeyName: 'alice', recoveryKeyId: 'key-1', recoveryCode: 'code-1' };

describe('auth flow integration: back navigation', () => {
  it('restore-menu back returns to get-started', () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onBack());
    expect(result.current.state.phase).toBe('get-started');
  });

  it('restore-credentials back returns to restore-menu', () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onSelectCredentialRestore());
    act(() => result.current.screenProps.restoreCredentials.onBack());
    expect(result.current.state.phase).toBe('restore-menu');
  });

  it('set-new-password back returns to restore-credentials', async () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onSelectCredentialRestore());
    await act(() => result.current.screenProps.restoreCredentials.onRestore(RECOVERY));
    act(() => result.current.screenProps.setNewPassword.onBack());
    expect(result.current.state.phase).toBe('restore-credentials');
  });

  it('register back returns to get-started', () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRegister());
    act(() => result.current.screenProps.register.onBack());
    expect(result.current.state.phase).toBe('get-started');
  });

});

describe('auth flow integration: cross-flow transitions', () => {
  it('starts restore, goes back, then completes login', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue(PASSWORD_CAPS);
    vi.mocked(config.identityClient.loginWithPassword).mockResolvedValue('token');
    const { result } = renderHook(() => useAuthFlow(config));

    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onBack());
    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('alice'));
    await act(() => result.current.screenProps.verifyPassword.overlayProps.onConfirm('P@ss1234'));
    expect(config.onAuthSuccess).toHaveBeenCalledWith('alice');
  });

  it('starts register, goes back, then enters restore', () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRegister());
    act(() => result.current.screenProps.register.onBack());
    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    expect(result.current.state.phase).toBe('restore-menu');
  });

  it('after restore success login, starts a new login flow', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.recoverAccount).mockResolvedValue(undefined);
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue(PASSWORD_CAPS);
    vi.mocked(config.identityClient.loginWithPassword).mockResolvedValue('token');
    const { result } = renderHook(() => useAuthFlow(config));

    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onSelectCredentialRestore());
    await act(() => result.current.screenProps.restoreCredentials.onRestore(RECOVERY));
    await act(() => result.current.screenProps.setNewPassword.onContinue('NewP@ss1'));
    act(() => result.current.screenProps.restoreSuccessModal.onLogin());
    expect(result.current.state.phase).toBe('get-started');

    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('alice'));
    await act(() => result.current.screenProps.verifyPassword.overlayProps.onConfirm('NewP@ss1'));
    expect(config.onAuthSuccess).toHaveBeenCalledWith('alice');
  });
});

describe('auth flow integration: error recovery', () => {
  it('failed registration shows error, user retries successfully', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.registerWithPassword)
      .mockRejectedValueOnce(new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'offline'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAuthFlow(config));

    act(() => result.current.screenProps.getStarted.onNavigateToRegister());
    await act(() => result.current.screenProps.register.onContinue({
      identityKeyName: 'alice', password: 'P@ss1234',
    }));
    expect(result.current.state.error).not.toBeNull();
    expect(result.current.state.isLoading).toBe(false);

    await act(() => result.current.screenProps.register.onContinue({
      identityKeyName: 'alice', password: 'P@ss1234',
    }));
    expect(config.onAuthSuccess).toHaveBeenCalledWith('alice');
  });

  it('failed password login shows error, user retries successfully', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue(PASSWORD_CAPS);
    vi.mocked(config.identityClient.loginWithPassword)
      .mockRejectedValueOnce(new IdentityError(IdentityErrorCode.INVALID_CREDENTIALS, 'bad'))
      .mockResolvedValueOnce('token');
    const { result } = renderHook(() => useAuthFlow(config));

    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('dave'));
    await act(() => result.current.screenProps.verifyPassword.overlayProps.onConfirm('wrong'));
    expect(result.current.state.error).not.toBeNull();

    await act(() => result.current.screenProps.verifyPassword.overlayProps.onConfirm('P@ss1234'));
    expect(config.onAuthSuccess).toHaveBeenCalledWith('dave');
  });

  it('identity-key-not-found modal close keeps phase, allows retry', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.recoverAccount)
      .mockRejectedValueOnce(new IdentityError(IdentityErrorCode.INVALID_RECOVERY_CREDENTIALS, 'bad'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useAuthFlow(config));

    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onSelectCredentialRestore());
    await act(() => result.current.screenProps.restoreCredentials.onRestore(RECOVERY));
    await act(() => result.current.screenProps.setNewPassword.onContinue('NewP@ss1'));
    expect(result.current.state.isIdentityKeyNotFoundVisible).toBe(true);

    act(() => result.current.screenProps.identityKeyNotFoundModal.onClose());
    expect(result.current.state.isIdentityKeyNotFoundVisible).toBe(false);
    expect(result.current.state.phase).toBe('set-new-password');

    await act(() => result.current.screenProps.setNewPassword.onContinue('NewP@ss1'));
    expect(result.current.state.isRestoreSuccessVisible).toBe(true);
  });

  it('network error on set-new-password shows error, not identity modal', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.recoverAccount).mockRejectedValue(
      new IdentityError(IdentityErrorCode.NETWORK_ERROR, 'offline'),
    );
    const { result } = renderHook(() => useAuthFlow(config));

    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onSelectCredentialRestore());
    await act(() => result.current.screenProps.restoreCredentials.onRestore(RECOVERY));
    await act(() => result.current.screenProps.setNewPassword.onContinue('NewP@ss1'));

    expect(result.current.state.error?.code).toBe(IdentityErrorCode.NETWORK_ERROR);
    expect(result.current.state.isIdentityKeyNotFoundVisible).toBe(false);
  });
});

describe('auth flow integration: state propagation', () => {
  it('identityKeyName propagates to verify-password screen', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue(PASSWORD_CAPS);
    const { result } = renderHook(() => useAuthFlow(config));

    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('carol'));
    expect(result.current.state.identityKeyName).toBe('carol');
  });

  it('recovery data propagates to set-new-password identityKeyName', async () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onSelectCredentialRestore());
    await act(() => result.current.screenProps.restoreCredentials.onRestore({
      identityKeyName: 'bob', recoveryKeyId: 'key-2', recoveryCode: 'code-2',
    }));
    expect(result.current.screenProps.setNewPassword.identityKeyName).toBe('bob');
  });

  it('restoreCredentials.isLoading is false after restore completes', async () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onSelectCredentialRestore());
    expect(result.current.screenProps.restoreCredentials.isLoading).toBe(false);

    await act(() => result.current.screenProps.restoreCredentials.onRestore(RECOVERY));
    expect(result.current.state.isLoading).toBe(false);
  });

  it('resetFlow clears state from previous restore attempt', async () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onSelectCredentialRestore());
    await act(() => result.current.screenProps.restoreCredentials.onRestore(RECOVERY));

    act(() => result.current.resetFlow());
    expect(result.current.state.identityKeyName).toBe('');
    expect(result.current.state.phase).toBe('get-started');
  });

  it('error clears on phase transition', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue({
      identityFound: false, supportsPasskey: false, supportsPassword: false, twoFAOptionsCount: null,
    });
    const { result } = renderHook(() => useAuthFlow(config));

    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('nobody'));
    expect(result.current.state.error).not.toBeNull();

    act(() => result.current.screenProps.getStarted.onNavigateToRegister());
    expect(result.current.state.error).toBeNull();
  });
});

describe('auth flow integration: modal lifecycle', () => {
  it('restore success onClose resets to get-started', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.recoverAccount).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuthFlow(config));

    act(() => result.current.screenProps.getStarted.onNavigateToRestore());
    act(() => result.current.screenProps.restoreMenu.onSelectCredentialRestore());
    await act(() => result.current.screenProps.restoreCredentials.onRestore(RECOVERY));
    await act(() => result.current.screenProps.setNewPassword.onContinue('NewP@ss1'));
    act(() => result.current.screenProps.restoreSuccessModal.onClose());
    expect(result.current.state.isRestoreSuccessVisible).toBe(false);
    expect(result.current.state.phase).toBe('get-started');
  });

  it('modals are hidden in initial state', () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    expect(result.current.screenProps.restoreSuccessModal.isVisible).toBe(false);
    expect(result.current.screenProps.identityKeyNotFoundModal.isVisible).toBe(false);
  });
});
