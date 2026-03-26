import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionDataSource } from '../data-sources/session-data-source';
import type { TokenManager } from '../token/token-manager';
import { logout, refreshToken, isAuthenticated } from './session';
import { IdentityErrorCode } from '../errors';

function createMockDeps() {
  const sessionDataSource: SessionDataSource = {
    refreshToken: vi.fn(() => Promise.resolve({ token: 'new-token' })),
    logout: vi.fn((_token: string, _username: string) => Promise.resolve()),
  };
  const tokenManager: TokenManager = {
    getTokens: vi.fn(() => Promise.resolve({ token: 'old-tok', refreshToken: 'ref-tok' })),
    setTokens: vi.fn(() => Promise.resolve()),
    clearTokens: vi.fn(() => Promise.resolve()),
    isTokenExpired: vi.fn(() => Promise.resolve(false)),
  };
  return { sessionDataSource, tokenManager };
}

describe('logout', () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps();
  });

  it('calls server logout and clears tokens', async () => {
    await logout('alice', deps);
    expect(deps.sessionDataSource.logout).toHaveBeenCalledWith('old-tok', 'alice');
    expect(deps.tokenManager.clearTokens).toHaveBeenCalledWith('alice');
  });

  it('clears tokens even when no tokens exist', async () => {
    vi.mocked(deps.tokenManager.getTokens).mockResolvedValueOnce(null);
    await logout('alice', deps);
    expect(deps.sessionDataSource.logout).not.toHaveBeenCalled();
    expect(deps.tokenManager.clearTokens).toHaveBeenCalledWith('alice');
  });
});

describe('refreshToken', () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps();
  });

  it('refreshes and stores new access token', async () => {
    await refreshToken('alice', deps);
    expect(deps.sessionDataSource.refreshToken).toHaveBeenCalledWith('old-tok', 'ref-tok');
    expect(deps.tokenManager.setTokens).toHaveBeenCalledWith('alice', {
      token: 'new-token',
      refreshToken: 'ref-tok',
    });
  });

  it('throws UNAUTHENTICATED when no tokens exist', async () => {
    vi.mocked(deps.tokenManager.getTokens).mockResolvedValueOnce(null);
    await expect(refreshToken('alice', deps)).rejects.toMatchObject({
      code: IdentityErrorCode.UNAUTHENTICATED,
    });
  });

  it('clears tokens on refresh failure', async () => {
    vi.mocked(deps.sessionDataSource.refreshToken).mockRejectedValueOnce(new Error('expired'));
    await expect(refreshToken('alice', deps)).rejects.toThrow('expired');
    expect(deps.tokenManager.clearTokens).toHaveBeenCalledWith('alice');
  });
});

describe('isAuthenticated', () => {
  it('returns true when token is not expired', async () => {
    const deps = createMockDeps();
    expect(await isAuthenticated('alice', deps)).toBe(true);
  });

  it('returns false when token is expired', async () => {
    const deps = createMockDeps();
    vi.mocked(deps.tokenManager.isTokenExpired).mockResolvedValueOnce(true);
    expect(await isAuthenticated('alice', deps)).toBe(false);
  });
});
