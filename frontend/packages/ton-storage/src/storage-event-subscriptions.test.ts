import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupStorageEventSubscriptions } from './storage-event-subscriptions';
import type { StorageManagerContext } from './types';
import type { AppStateProvider } from '@ion/platform';
import type { NetworkStateProvider } from '@ion/network';

vi.mock('./storage-health-check', () => ({
  runStorageHealthCheck: vi.fn(),
}));

vi.mock('./storage-lifecycle', () => ({
  restartStorage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

const { runStorageHealthCheck } = await import('./storage-health-check');
const { restartStorage } = await import('./storage-lifecycle');
const mockHealthCheck = vi.mocked(runStorageHealthCheck);
const mockRestart = vi.mocked(restartStorage);

function createContext(overrides?: Partial<StorageManagerContext>): StorageManagerContext {
  return {
    apiPort: 9090,
    dbPath: '/data/ton-storage',
    healthCheckIntervalMs: 30_000,
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

function createAppProvider(): AppStateProvider & {
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

describe('setupStorageEventSubscriptions', () => {
  it('restarts storage on network interface change', () => {
    const ctx = createContext();
    const network = createNetworkProvider();
    setupStorageEventSubscriptions(ctx, { networkStateProvider: network, appStateProvider: createAppProvider() });
    network.triggerInterfaceChange();
    expect(mockRestart).toHaveBeenCalledWith(ctx);
  });

  it('transitions to disconnected when going offline', () => {
    const ctx = createContext();
    const network = createNetworkProvider();
    setupStorageEventSubscriptions(ctx, { networkStateProvider: network, appStateProvider: createAppProvider() });
    network.triggerStateChange(false);
    expect(ctx.transition).toHaveBeenCalledWith('disconnected');
  });

  it('restarts storage when coming back online from disconnected', () => {
    const ctx = createContext();
    ctx.getStatus = vi.fn().mockReturnValue('disconnected');
    const network = createNetworkProvider();
    setupStorageEventSubscriptions(ctx, { networkStateProvider: network, appStateProvider: createAppProvider() });
    network.triggerStateChange(true);
    expect(mockRestart).toHaveBeenCalledWith(ctx);
  });

  it('checks health and restarts on foreground after background', async () => {
    mockHealthCheck.mockResolvedValue(false);
    const ctx = createContext();
    const appState = createAppProvider();
    setupStorageEventSubscriptions(ctx, { networkStateProvider: createNetworkProvider(), appStateProvider: appState });
    appState.triggerStateChange('background');
    appState.triggerStateChange('active');
    await vi.waitFor(() => expect(mockHealthCheck).toHaveBeenCalled());
    await vi.waitFor(() => expect(mockRestart).toHaveBeenCalledWith(ctx));
  });

  it('skips restart if health check passes on foreground', async () => {
    mockHealthCheck.mockResolvedValue(true);
    const ctx = createContext();
    const appState = createAppProvider();
    setupStorageEventSubscriptions(ctx, { networkStateProvider: createNetworkProvider(), appStateProvider: appState });
    appState.triggerStateChange('background');
    appState.triggerStateChange('active');
    await vi.waitFor(() => expect(mockHealthCheck).toHaveBeenCalled());
    expect(mockRestart).not.toHaveBeenCalled();
  });

  it('cleans up all subscriptions on dispose', () => {
    const ctx = createContext();
    const network = createNetworkProvider();
    const appState = createAppProvider();
    const cleanup = setupStorageEventSubscriptions(ctx, { networkStateProvider: network, appStateProvider: appState });
    cleanup();
    network.triggerInterfaceChange();
    appState.triggerStateChange('background');
    appState.triggerStateChange('active');
    expect(mockRestart).not.toHaveBeenCalled();
  });
});
