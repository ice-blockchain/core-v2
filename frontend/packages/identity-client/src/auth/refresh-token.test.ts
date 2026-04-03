import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkError } from '@ion/network';
import type { SessionDataSource } from '../data-sources/session-data-source';
import type { TokenManager } from '../token/token-manager';
import { refreshToken } from './refresh-token';
import { IdentityErrorCode } from '../errors';

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
  return { sessionDataSource, tokenManager };
}

describe('refreshToken', () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps();
  });

  it('refreshes and stores new access token', async () => {
    await refreshToken('alice', deps);
    expect(deps.sessionDataSource.refreshToken).toHaveBeenCalledWith({
      username: 'alice',
      currentToken: 'old-tok',
      refreshToken: 'ref-tok',
    });
    expect(deps.tokenManager.setTokens).toHaveBeenCalledWith('alice', {
      token: 'new-token',
      refreshToken: 'ref-tok',
    });
  });

  it('stores server-provided refresh token when rotated', async () => {
    vi.mocked(deps.sessionDataSource.refreshToken).mockResolvedValueOnce({
      token: 'new-token',
      refreshToken: 'new-ref-tok',
    });
    await refreshToken('alice', deps);
    expect(deps.tokenManager.setTokens).toHaveBeenCalledWith('alice', {
      token: 'new-token',
      refreshToken: 'new-ref-tok',
    });
  });

  it('throws UNAUTHENTICATED when no tokens exist', async () => {
    vi.mocked(deps.tokenManager.getTokens).mockResolvedValueOnce(null);
    await expect(refreshToken('alice', deps)).rejects.toMatchObject({
      code: IdentityErrorCode.UNAUTHENTICATED,
    });
  });

  it('clears tokens on 401 auth failure', async () => {
    const authError = new NetworkError({ code: 'CLIENT_ERROR', message: 'Unauthorized', status: 401 });
    vi.mocked(deps.sessionDataSource.refreshToken).mockRejectedValueOnce(authError);
    await expect(refreshToken('alice', deps)).rejects.toThrow('Unauthorized');
    expect(deps.tokenManager.clearTokens).toHaveBeenCalledWith('alice');
  });

  it('preserves tokens on transient network failure', async () => {
    vi.mocked(deps.sessionDataSource.refreshToken).mockRejectedValueOnce(new Error('timeout'));
    await expect(refreshToken('alice', deps)).rejects.toThrow('timeout');
    expect(deps.tokenManager.clearTokens).not.toHaveBeenCalled();
  });
});
