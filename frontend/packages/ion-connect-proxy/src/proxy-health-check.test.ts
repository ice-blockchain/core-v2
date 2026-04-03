import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runProxyHealthCheck } from './proxy-health-check';

vi.mock('./native-ion-connect-proxy', () => ({
  getNativeIonConnectProxy: vi.fn(),
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { warning: vi.fn(), error: vi.fn() },
}));

const { getNativeIonConnectProxy } = await import('./native-ion-connect-proxy');
const mockGetNative = vi.mocked(getNativeIonConnectProxy);

function createMockNative(checkResult: Promise<boolean>) {
  return { checkProxy: vi.fn().mockReturnValue(checkResult) } as unknown as ReturnType<typeof getNativeIonConnectProxy>;
}

beforeEach(() => vi.clearAllMocks());

describe('runProxyHealthCheck', () => {
  it('returns true when proxy is healthy', async () => {
    mockGetNative.mockReturnValue(createMockNative(Promise.resolve(true)));
    const result = await runProxyHealthCheck(3000);
    expect(result).toBe(true);
  });

  it('returns false when proxy is unhealthy', async () => {
    mockGetNative.mockReturnValue(createMockNative(Promise.resolve(false)));
    const result = await runProxyHealthCheck(3000);
    expect(result).toBe(false);
  });

  it('returns false when native module throws', async () => {
    mockGetNative.mockReturnValue(createMockNative(Promise.reject(new Error('crash'))));
    const result = await runProxyHealthCheck(3000);
    expect(result).toBe(false);
  });

  it('returns false on timeout', async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise<boolean>(() => {});
    mockGetNative.mockReturnValue(createMockNative(neverResolves));
    const resultPromise = runProxyHealthCheck(1000);
    vi.advanceTimersByTime(1000);
    const result = await resultPromise;
    expect(result).toBe(false);
    vi.useRealTimers();
  });
});
