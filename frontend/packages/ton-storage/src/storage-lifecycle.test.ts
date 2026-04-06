import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restartStorage } from './storage-lifecycle';
import type { StorageManagerContext } from './types';

vi.mock('./start-ton-storage', () => ({
  startTonStorage: vi.fn(),
}));

vi.mock('./stop-ton-storage', () => ({
  stopTonStorage: vi.fn(),
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { startTonStorage } = await import('./start-ton-storage');
const { stopTonStorage } = await import('./stop-ton-storage');
const mockStart = vi.mocked(startTonStorage);
const mockStop = vi.mocked(stopTonStorage);

function createContext(overrides?: Partial<StorageManagerContext>): StorageManagerContext {
  return {
    apiPort: 9090,
    dbPath: '/data/ton-storage',
    healthCheckIntervalMs: 30_000,
    maxRestartAttempts: 3,
    restartBaseDelayMs: 10,
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

beforeEach(() => {
  vi.clearAllMocks();
  mockStart.mockResolvedValue('OK');
  mockStop.mockResolvedValue('OK');
});

describe('restartStorage', () => {
  it('stops then starts the storage on success', async () => {
    const ctx = createContext();
    await restartStorage(ctx);
    expect(mockStop).toHaveBeenCalledOnce();
    expect(mockStart).toHaveBeenCalledOnce();
    expect(ctx.transition).toHaveBeenCalledWith('reconnecting');
    expect(ctx.transition).toHaveBeenCalledWith('connected');
  });

  it('transitions to disconnected after exhausting retries', async () => {
    mockStart.mockRejectedValue(new Error('fail'));
    const ctx = createContext({ maxRestartAttempts: 2, restartBaseDelayMs: 1 });
    await restartStorage(ctx);
    expect(mockStart).toHaveBeenCalledTimes(2);
    expect(ctx.transition).toHaveBeenCalledWith('disconnected');
  });

  it('does not restart concurrently', async () => {
    const ctx = createContext();
    const first = restartStorage(ctx);
    const second = restartStorage(ctx);
    await Promise.all([first, second]);
    expect(mockStop).toHaveBeenCalledOnce();
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it('skips restart when disposed', async () => {
    const ctx = createContext({ disposed: true });
    await restartStorage(ctx);
    expect(mockStop).not.toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('ignores stop failure and continues with start', async () => {
    mockStop.mockRejectedValue(new Error('already stopped'));
    const ctx = createContext();
    await restartStorage(ctx);
    expect(mockStart).toHaveBeenCalledOnce();
    expect(ctx.transition).toHaveBeenCalledWith('connected');
  });
});
