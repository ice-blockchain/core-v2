import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStorageHealthCheck } from './storage-health-check';

vi.mock('./native-ton-storage', () => ({
  getNativeTonStorage: vi.fn(),
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { warning: vi.fn(), error: vi.fn() },
}));

const { getNativeTonStorage } = await import('./native-ton-storage');
const mockGetNative = vi.mocked(getNativeTonStorage);

function createMockNative(checkResult: Promise<boolean>) {
  return { checkStorage: vi.fn().mockReturnValue(checkResult) } as unknown as ReturnType<typeof getNativeTonStorage>;
}

beforeEach(() => vi.clearAllMocks());

describe('runStorageHealthCheck', () => {
  it('returns true when storage is healthy', async () => {
    mockGetNative.mockReturnValue(createMockNative(Promise.resolve(true)));
    const result = await runStorageHealthCheck(3000);
    expect(result).toBe(true);
  });

  it('returns false when storage is unhealthy', async () => {
    mockGetNative.mockReturnValue(createMockNative(Promise.resolve(false)));
    const result = await runStorageHealthCheck(3000);
    expect(result).toBe(false);
  });

  it('returns false when native module throws', async () => {
    mockGetNative.mockReturnValue(createMockNative(Promise.reject(new Error('crash'))));
    const result = await runStorageHealthCheck(3000);
    expect(result).toBe(false);
  });

  it('returns false on timeout', async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise<boolean>(() => {});
    mockGetNative.mockReturnValue(createMockNative(neverResolves));
    const resultPromise = runStorageHealthCheck(1000);
    vi.advanceTimersByTime(1000);
    const result = await resultPromise;
    expect(result).toBe(false);
    vi.useRealTimers();
  });
});
