import { describe, it, expect, vi } from 'vitest';
import type { TokenManager } from '../token/token-manager';
import { isAuthenticated } from './is-authenticated';

function createMockDeps() {
  const tokenManager: TokenManager = {
    getTokens: vi.fn(() => Promise.resolve(null)),
    setTokens: vi.fn(() => Promise.resolve()),
    clearTokens: vi.fn(() => Promise.resolve()),
    isTokenExpired: vi.fn(() => Promise.resolve(false)),
  };
  return { tokenManager };
}

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
