import { describe, it, expect, vi } from 'vitest';
import type { TokenManager } from '../token/token-manager';
import type { InternalAuthStore } from '../auth-store';
import { restoreAuth } from './restore-auth';

function createMockTokenManager(tokensByUser: Record<string, boolean>): TokenManager {
  const trackedUsers = Object.keys(tokensByUser);
  return {
    getTokens: vi.fn((username: string) =>
      Promise.resolve(tokensByUser[username] ? { token: 't', refreshToken: 'r' } : null),
    ),
    setTokens: vi.fn(() => Promise.resolve()),
    clearTokens: vi.fn(() => Promise.resolve()),
    isTokenExpired: vi.fn(() => Promise.resolve(false)),
    getTrackedUsers: vi.fn(() => Promise.resolve(trackedUsers)),
  };
}

function createMockAuthStore(): InternalAuthStore {
  const users: string[] = [];
  return {
    getSnapshot: () => users,
    subscribe: vi.fn(() => () => {}),
    addUser: vi.fn((username: string) => { users.push(username); }),
    removeUser: vi.fn(),
  };
}

describe('restoreAuth', () => {
  it('restores users with valid tokens to auth store', async () => {
    const tokenManager = createMockTokenManager({ alice: true, bob: true });
    const authStore = createMockAuthStore();

    await restoreAuth({ tokenManager, authStore });

    expect(authStore.addUser).toHaveBeenCalledWith('alice');
    expect(authStore.addUser).toHaveBeenCalledWith('bob');
    expect(authStore.addUser).toHaveBeenCalledTimes(2);
  });

  it('does nothing when no tracked users exist', async () => {
    const tokenManager = createMockTokenManager({});
    const authStore = createMockAuthStore();

    await restoreAuth({ tokenManager, authStore });

    expect(authStore.addUser).not.toHaveBeenCalled();
  });

  it('removes stale users whose tokens are missing', async () => {
    const tokenManager = createMockTokenManager({ alice: true, bob: false });
    const authStore = createMockAuthStore();

    await restoreAuth({ tokenManager, authStore });

    expect(authStore.addUser).toHaveBeenCalledWith('alice');
    expect(authStore.addUser).toHaveBeenCalledTimes(1);
    expect(tokenManager.clearTokens).toHaveBeenCalledWith('bob');
  });

  it('clears all stale users when none have tokens', async () => {
    const tokenManager = createMockTokenManager({ alice: false, bob: false });
    const authStore = createMockAuthStore();

    await restoreAuth({ tokenManager, authStore });

    expect(authStore.addUser).not.toHaveBeenCalled();
    expect(tokenManager.clearTokens).toHaveBeenCalledWith('alice');
    expect(tokenManager.clearTokens).toHaveBeenCalledWith('bob');
  });

  it('handles mixed valid and stale users', async () => {
    const tokenManager = createMockTokenManager({ alice: false, bob: true, carol: false });
    const authStore = createMockAuthStore();

    await restoreAuth({ tokenManager, authStore });

    expect(authStore.addUser).toHaveBeenCalledWith('bob');
    expect(authStore.addUser).toHaveBeenCalledTimes(1);
    expect(tokenManager.clearTokens).toHaveBeenCalledWith('alice');
    expect(tokenManager.clearTokens).toHaveBeenCalledWith('carol');
    expect(tokenManager.clearTokens).toHaveBeenCalledTimes(2);
  });
});
