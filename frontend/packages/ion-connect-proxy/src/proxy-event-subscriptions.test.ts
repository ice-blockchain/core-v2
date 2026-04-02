import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupEventSubscriptions } from './proxy-event-subscriptions';
import type { ProxyManagerContext, AppStateProvider } from './types';
import type { NetworkStateProvider } from '@ion/network';

vi.mock('./proxy-health-check', () => ({
  runProxyHealthCheck: vi.fn(),
}));

vi.mock('./proxy-lifecycle', () => ({
  restartProxy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

const { runProxyHealthCheck } = await import('./proxy-health-check');
const { restartProxy } = await import('./proxy-lifecycle');
const mockHealthCheck = vi.mocked(runProxyHealthCheck);
const mockRestart = vi.mocked(restartProxy);

function createContext(overrides?: Partial<ProxyManagerContext>): ProxyManagerContext {
  return {
    port: 8888,
    healthCheckIntervalMs: 30_000,
    healthCheckTimeoutMs: 3_000,
    maxRestartAttempts: 3,
    restartBaseDelayMs: 1000,
    transition: vi.fn(),
    getStatus: vi.fn().mockReturnValue('connected'),
    onStatusChange: vi.fn().mockReturnValue(() => {}),
    isRestarting: false,
    restartPromise: null,
    healthTimerId: null,
    disposed: false,
    ...overrides,
  };
}

function createNetworkProvider(): NetworkStateProvider & {
  triggerInterfaceChange: () => void;
  triggerStateChange: (isOnline: boolean) => void;
} {
  let interfaceHandler: (() => void) | null = null;
  let stateHandler: ((isOnline: boolean) => void) | null = null;
  return {
    isOnline: () => true,
    onNetworkInterfaceChange: (handler) => { interfaceHandler = handler; return () => { interfaceHandler = null; }; },
    onStateChange: (handler) => { stateHandler = handler; return () => { stateHandler = null; }; },
    dispose: vi.fn(),
    triggerInterfaceChange: () => interfaceHandler?.(),
    triggerStateChange: (isOnline) => stateHandler?.(isOnline),
  };
}

function createAppStateProvider(): AppStateProvider & {
  triggerStateChange: (state: 'active' | 'inactive' | 'background') => void;
} {
  let handler: ((state: 'active' | 'inactive' | 'background') => void) | null = null;
  return {
    getCurrentState: () => 'active',
    onStateChange: (cb) => { handler = cb; return () => { handler = null; }; },
    triggerStateChange: (state) => handler?.(state),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('setupEventSubscriptions', () => {
  it('restarts proxy on network interface change', () => {
    const ctx = createContext();
    const network = createNetworkProvider();
    setupEventSubscriptions(ctx, { networkStateProvider: network });
    network.triggerInterfaceChange();
    expect(mockRestart).toHaveBeenCalledWith(ctx);
  });

  it('transitions to disconnected when going offline', () => {
    const ctx = createContext();
    const network = createNetworkProvider();
    setupEventSubscriptions(ctx, { networkStateProvider: network });
    network.triggerStateChange(false);
    expect(ctx.transition).toHaveBeenCalledWith('disconnected');
  });

  it('restarts proxy when coming back online from disconnected', () => {
    const ctx = createContext();
    ctx.getStatus = vi.fn().mockReturnValue('disconnected');
    const network = createNetworkProvider();
    setupEventSubscriptions(ctx, { networkStateProvider: network });
    network.triggerStateChange(true);
    expect(mockRestart).toHaveBeenCalledWith(ctx);
  });

  it('checks health and restarts on foreground after background', async () => {
    mockHealthCheck.mockResolvedValue(false);
    const ctx = createContext();
    const appState = createAppStateProvider();
    setupEventSubscriptions(ctx, { appStateProvider: appState });
    appState.triggerStateChange('background');
    appState.triggerStateChange('active');
    await vi.waitFor(() => expect(mockHealthCheck).toHaveBeenCalled());
    await vi.waitFor(() => expect(mockRestart).toHaveBeenCalledWith(ctx));
  });

  it('skips restart if health check passes on foreground', async () => {
    mockHealthCheck.mockResolvedValue(true);
    const ctx = createContext();
    const appState = createAppStateProvider();
    setupEventSubscriptions(ctx, { appStateProvider: appState });
    appState.triggerStateChange('background');
    appState.triggerStateChange('active');
    await vi.waitFor(() => expect(mockHealthCheck).toHaveBeenCalled());
    expect(mockRestart).not.toHaveBeenCalled();
  });

  it('cleans up all subscriptions on dispose', () => {
    const ctx = createContext();
    const network = createNetworkProvider();
    const appState = createAppStateProvider();
    const cleanup = setupEventSubscriptions(ctx, { networkStateProvider: network, appStateProvider: appState });
    cleanup();
    network.triggerInterfaceChange();
    appState.triggerStateChange('background');
    appState.triggerStateChange('active');
    expect(mockRestart).not.toHaveBeenCalled();
  });
});
