import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { IdentityClient } from '@ion/identity-client';
import { IdentityError, IdentityErrorCode } from '@ion/identity-client';
import { useAuthFlow } from './use-auth-flow';
import type { AuthFlowConfig } from './types';
import type { ReactNode } from 'react';

vi.mock('@ion/identity-client', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as Record<string, unknown>), isPasskeyAvailable: () => false };
});

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

function createConfig(overrides?: Partial<AuthFlowConfig>): AuthFlowConfig {
  return {
    identityClient: createMockClient(),
    onAuthSuccess: vi.fn(),
    loadingElement: 'loading...' as unknown as ReactNode,
    ...overrides,
  };
}

describe('useAuthFlow', () => {
  it('starts in get-started phase', () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    expect(result.current.state.phase).toBe('get-started');
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('navigates to register when onNavigateToRegister is called', () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRegister());
    expect(result.current.state.phase).toBe('register');
  });

  it('navigates back to get-started from register', () => {
    const { result } = renderHook(() => useAuthFlow(createConfig()));
    act(() => result.current.screenProps.getStarted.onNavigateToRegister());
    act(() => result.current.screenProps.register.onBack());
    expect(result.current.state.phase).toBe('get-started');
  });

  it('completes registration flow and calls onAuthSuccess', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.registerWithPassword).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuthFlow(config));

    act(() => result.current.screenProps.getStarted.onNavigateToRegister());
    await act(() => result.current.screenProps.register.onContinue({
      identityKeyName: 'alice', password: 'P@ss1234',
    }));

    expect(config.onAuthSuccess).toHaveBeenCalledWith('alice');
  });

  it('completes passkey login flow', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: true, supportsPassword: false,
    });
    vi.mocked(config.identityClient.loginWithPasskey).mockResolvedValue('token');
    const { result } = renderHook(() => useAuthFlow(config));

    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('bob'));

    expect(result.current.state.phase).toBe('verify-passkey');
    expect(config.onAuthSuccess).toHaveBeenCalledWith('bob');
  });

  it('falls back to password when passkey is cancelled', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: true, supportsPassword: true,
    });
    vi.mocked(config.identityClient.loginWithPasskey).mockRejectedValue(
      new IdentityError(IdentityErrorCode.PASSKEY_CANCELLED, 'cancelled'),
    );
    const { result } = renderHook(() => useAuthFlow(config));

    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('carol'));

    expect(result.current.state.phase).toBe('verify-password');
    expect(result.current.state.identityKeyName).toBe('carol');
  });

  it('completes password login flow', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: false, supportsPassword: true,
    });
    vi.mocked(config.identityClient.loginWithPassword).mockResolvedValue('token');
    const { result } = renderHook(() => useAuthFlow(config));

    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('dave'));
    expect(result.current.state.phase).toBe('verify-password');

    await act(() => result.current.screenProps.verifyPassword.overlayProps.onConfirm('P@ss1234'));
    expect(config.onAuthSuccess).toHaveBeenCalledWith('dave');
  });

  it('shows error on failed login attempt', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue({
      identityFound: false, supportsPasskey: false, supportsPassword: false,
    });
    const { result } = renderHook(() => useAuthFlow(config));

    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('nobody'));

    expect(result.current.state.phase).toBe('get-started');
    expect(result.current.state.error).not.toBeNull();
    expect(result.current.state.error?.code).toBe(IdentityErrorCode.USER_NOT_FOUND);
  });

  it('resetFlow returns to get-started and clears state', async () => {
    const config = createConfig();
    const { result } = renderHook(() => useAuthFlow(config));

    act(() => result.current.screenProps.getStarted.onNavigateToRegister());
    expect(result.current.state.phase).toBe('register');

    act(() => result.current.resetFlow());
    expect(result.current.state.phase).toBe('get-started');
    expect(result.current.state.identityKeyName).toBe('');
  });

  it('logout delegates to identityClient', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.logout).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuthFlow(config));

    await result.current.logout('alice');
    expect(config.identityClient.logout).toHaveBeenCalledWith('alice');
  });

  it('isAuthenticated delegates to identityClient', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.isAuthenticated).mockResolvedValue(true);
    const { result } = renderHook(() => useAuthFlow(config));

    const authenticated = await result.current.isAuthenticated('alice');
    expect(authenticated).toBe(true);
    expect(config.identityClient.isAuthenticated).toHaveBeenCalledWith('alice');
  });

  it('provides correct verifyPasskey props', async () => {
    const config = createConfig();
    vi.mocked(config.identityClient.getLoginCapabilities).mockResolvedValue({
      identityFound: true, supportsPasskey: true, supportsPassword: false,
    });
    vi.mocked(config.identityClient.loginWithPasskey).mockResolvedValue('token');
    const { result } = renderHook(() => useAuthFlow(config));

    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('eve'));

    expect(result.current.screenProps.verifyPasskey.identityKeyName).toBe('eve');
    expect(result.current.screenProps.verifyPasskey.loadingElement).toBe(config.loadingElement);
    expect(typeof result.current.screenProps.verifyPasskey.onBack).toBe('function');
    expect(typeof result.current.screenProps.verifyPasskey.onDismiss).toBe('function');
  });

  it('blocks concurrent registration calls', async () => {
    const config = createConfig();
    let resolveRegister: () => void;
    const pending = new Promise<void>((r) => { resolveRegister = r; });
    vi.mocked(config.identityClient.registerWithPassword).mockReturnValue(pending);
    const { result } = renderHook(() => useAuthFlow(config));

    act(() => result.current.screenProps.getStarted.onNavigateToRegister());

    const first = act(() => result.current.screenProps.register.onContinue({
      identityKeyName: 'alice', password: 'P@ss1234',
    }));
    await act(() => result.current.screenProps.register.onContinue({
      identityKeyName: 'alice', password: 'P@ss1234',
    }));

    resolveRegister!();
    await first;

    expect(config.identityClient.registerWithPassword).toHaveBeenCalledTimes(1);
  });

  it('blocks concurrent login attempts', async () => {
    const config = createConfig();
    let resolveCapabilities: (v: unknown) => void;
    const pending = new Promise((r) => { resolveCapabilities = r; });
    vi.mocked(config.identityClient.getLoginCapabilities).mockReturnValue(pending as Promise<never>);
    const { result } = renderHook(() => useAuthFlow(config));

    const first = act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('alice'));
    await act(() => result.current.screenProps.getStarted.onNavigateToVerifyPassword('alice'));

    resolveCapabilities!({ identityFound: false, supportsPasskey: false, supportsPassword: false });
    await first;

    expect(config.identityClient.getLoginCapabilities).toHaveBeenCalledTimes(1);
  });
});
