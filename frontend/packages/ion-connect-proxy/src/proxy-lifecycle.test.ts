import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restartProxy } from './proxy-lifecycle';
import type { ProxyManagerContext } from './types';

vi.mock('./start-ion-connect-proxy', () => ({
  startIonConnectProxy: vi.fn(),
}));

vi.mock('./stop-ion-connect-proxy', () => ({
  stopIonConnectProxy: vi.fn(),
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { startIonConnectProxy } = await import('./start-ion-connect-proxy');
const { stopIonConnectProxy } = await import('./stop-ion-connect-proxy');
const mockStart = vi.mocked(startIonConnectProxy);
const mockStop = vi.mocked(stopIonConnectProxy);

function createContext(overrides?: Partial<ProxyManagerContext>): ProxyManagerContext {
  return {
    port: 8888,
    healthCheckIntervalMs: 30_000,
    healthCheckTimeoutMs: 3_000,
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

describe('restartProxy', () => {
  it('stops then starts the proxy on success', async () => {
    const ctx = createContext();
    await restartProxy(ctx);
    expect(mockStop).toHaveBeenCalledOnce();
    expect(mockStart).toHaveBeenCalledOnce();
    expect(ctx.transition).toHaveBeenCalledWith('reconnecting');
    expect(ctx.transition).toHaveBeenCalledWith('connected');
  });

  it('transitions to disconnected after exhausting retries', async () => {
    mockStart.mockRejectedValue(new Error('fail'));
    const ctx = createContext({ maxRestartAttempts: 2, restartBaseDelayMs: 1 });
    await restartProxy(ctx);
    expect(mockStart).toHaveBeenCalledTimes(2);
    expect(ctx.transition).toHaveBeenCalledWith('disconnected');
  });

  it('does not restart concurrently', async () => {
    const ctx = createContext();
    const first = restartProxy(ctx);
    const second = restartProxy(ctx);
    await Promise.all([first, second]);
    expect(mockStop).toHaveBeenCalledOnce();
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it('skips restart when disposed', async () => {
    const ctx = createContext({ disposed: true });
    await restartProxy(ctx);
    expect(mockStop).not.toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('ignores stop failure and continues with start', async () => {
    mockStop.mockRejectedValue(new Error('already stopped'));
    const ctx = createContext();
    await restartProxy(ctx);
    expect(mockStart).toHaveBeenCalledOnce();
    expect(ctx.transition).toHaveBeenCalledWith('connected');
  });
});
