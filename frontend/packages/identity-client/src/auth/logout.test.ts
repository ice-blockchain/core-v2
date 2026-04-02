import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionDataSource } from '../data-sources/session-data-source';
import type { TokenManager } from '../token/token-manager';
import { logout } from './logout';

function createMockAuthStore() {
  return { getSnapshot: () => [] as readonly string[], subscribe: () => () => {}, addUser: vi.fn(), removeUser: vi.fn() };
}

function createMockDeps() {
  const sessionDataSource: SessionDataSource = {
    refreshToken: vi.fn(() => Promise.resolve({ token: 'new-token' })),
    logout: vi.fn((_username: string) => Promise.resolve()),
  };
  const tokenManager: TokenManager = {
    getTokens: vi.fn(() => Promise.resolve({ token: 'old-tok', refreshToken: 'ref-tok' })),
    setTokens: vi.fn(() => Promise.resolve()),
    clearTokens: vi.fn(() => Promise.resolve()),
    isTokenExpired: vi.fn(() => Promise.resolve(false)),
    getTrackedUsers: vi.fn(() => Promise.resolve([])),
  };
  return { sessionDataSource, tokenManager, authStore: createMockAuthStore() };
}

describe('logout', () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps();
  });

  it('calls server logout and clears tokens', async () => {
    await logout('alice', deps);
    expect(deps.sessionDataSource.logout).toHaveBeenCalledWith('alice');
    expect(deps.tokenManager.clearTokens).toHaveBeenCalledWith('alice');
  });

  it('clears tokens even when server logout fails', async () => {
    vi.mocked(deps.sessionDataSource.logout).mockRejectedValueOnce(new Error('network error'));
    await expect(logout('alice', deps)).rejects.toThrow('network error');
    expect(deps.tokenManager.clearTokens).toHaveBeenCalledWith('alice');
  });

  it('removes user from auth store on logout', async () => {
    await logout('alice', deps);
    expect(deps.authStore.removeUser).toHaveBeenCalledWith('alice');
  });

  it('removes user from auth store even when clearTokens throws', async () => {
    vi.mocked(deps.tokenManager.clearTokens).mockRejectedValueOnce(new Error('storage error'));
    await expect(logout('alice', deps)).rejects.toThrow('storage error');
    expect(deps.authStore.removeUser).toHaveBeenCalledWith('alice');
  });
});
