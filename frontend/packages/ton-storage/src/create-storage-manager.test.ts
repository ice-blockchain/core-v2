import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStorageManager } from './create-storage-manager';
import type { StorageManagerConfig } from './types';

vi.mock('./start-ton-storage', () => ({
  startTonStorage: vi.fn().mockResolvedValue('OK'),
}));

vi.mock('./stop-ton-storage', () => ({
  stopTonStorage: vi.fn().mockResolvedValue('OK'),
}));

vi.mock('./native-ton-storage', () => ({
  getNativeTonStorage: vi.fn().mockReturnValue({
    checkStorage: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@ion/platform', () => ({
  createAppStateProvider: vi.fn().mockReturnValue({
    getCurrentState: () => 'active',
    onStateChange: () => () => {},
  }),
}));

const { startTonStorage } = await import('./start-ton-storage');
const { stopTonStorage } = await import('./stop-ton-storage');

beforeEach(() => vi.clearAllMocks());

function createTestConfig(overrides?: Partial<StorageManagerConfig>): StorageManagerConfig {
  return {
    dbPath: '/data/ton-storage',
    networkStateProvider: {
      isOnline: () => true,
      onNetworkInterfaceChange: () => () => {},
      onStateChange: () => () => {},
      dispose: vi.fn(),
    },
    appStateProvider: {
      getCurrentState: () => 'active',
      onStateChange: () => () => {},
    },
    ...overrides,
  };
}

describe('createStorageManager', () => {
  it('starts storage and transitions to connected', async () => {
    const manager = createStorageManager(createTestConfig({ apiPort: 9091 }));
    const states: string[] = [];
    manager.onStatusChange((s) => states.push(s));
    await manager.start();
    expect(startTonStorage).toHaveBeenCalledWith(expect.objectContaining({ apiPort: 9091 }));
    expect(manager.getStatus()).toBe('connected');
    expect(states).toEqual(['connecting', 'connected']);
    manager.dispose();
  });

  it('stops storage and transitions to disconnected', async () => {
    const manager = createStorageManager(createTestConfig());
    await manager.start();
    await manager.stop();
    expect(stopTonStorage).toHaveBeenCalled();
    expect(manager.getStatus()).toBe('disconnected');
    manager.dispose();
  });

  it('creates a TonStorageClient via createClient', async () => {
    const manager = createStorageManager(createTestConfig());
    await manager.start();
    const client = manager.createClient();
    expect(client.addBag).toBeDefined();
    expect(client.listBags).toBeDefined();
    expect(client.getBagDetails).toBeDefined();
    expect(client.removeBag).toBeDefined();
    manager.dispose();
  });

  it('onStatusChange returns unsubscribe function', async () => {
    const manager = createStorageManager(createTestConfig());
    const states: string[] = [];
    const unsub = manager.onStatusChange((s) => states.push(s));
    await manager.start();
    unsub();
    await manager.stop();
    expect(states).toEqual(['connecting', 'connected']);
    manager.dispose();
  });
});
