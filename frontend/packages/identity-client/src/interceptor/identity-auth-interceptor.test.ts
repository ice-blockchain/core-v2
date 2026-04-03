import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkError } from '@ion/network';
import type { TokenManager } from '../token/token-manager';
import { createIdentityAuthInterceptor } from './identity-auth-interceptor';

function createMockTokenManager(tokens: Record<string, { token: string; refreshToken: string } | null> = {}): TokenManager {
  return {
    getTokens: vi.fn((username: string) => Promise.resolve(tokens[username] ?? null)),
    setTokens: vi.fn(() => Promise.resolve()),
    clearTokens: vi.fn(() => Promise.resolve()),
    isTokenExpired: vi.fn(() => Promise.resolve(false)),
    getTrackedUsers: vi.fn(() => Promise.resolve([])),
  };
}

function createDeps(overrides: Partial<{
  tokenManager: TokenManager;
  refreshFn: (username: string) => Promise<void>;
  refreshLocks: Map<string, Promise<void>>;
  trustedBaseUrl: string;
}> = {}) {
  return {
    tokenManager: overrides.tokenManager ?? createMockTokenManager(),
    refreshFn: overrides.refreshFn ?? vi.fn(() => Promise.resolve()),
    refreshLocks: overrides.refreshLocks ?? new Map(),
    trustedBaseUrl: overrides.trustedBaseUrl ?? 'https://api.example.com',
  };
}

function makeRequest(headers: Record<string, string> = {}) {
  return { url: '/auth/credentials', method: 'GET', headers };
}

function makeAuthError(requestUrl: string): NetworkError {
  return new NetworkError({
    code: 'AUTH_EXPIRED',
    message: 'Unauthorized',
    status: 401,
    requestUrl,
  });
}

describe('createIdentityAuthInterceptor', () => {
  describe('onRequest', () => {
    it('injects Authorization from stored token when X-Username is present', async () => {
      const tokenManager = createMockTokenManager({ alice: { token: 'tok-alice', refreshToken: 'ref-alice' } });
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager }));
      const result = await interceptor.onRequest!(makeRequest({ 'X-Username': 'alice' }));
      expect(result.headers.Authorization).toBe('Bearer tok-alice');
    });

    it('skips injection when Authorization header already set', async () => {
      const tokenManager = createMockTokenManager({ alice: { token: 'tok-alice', refreshToken: 'ref-alice' } });
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager }));
      const request = makeRequest({ 'X-Username': 'alice', Authorization: 'Bearer custom-token' });
      const result = await interceptor.onRequest!(request);
      expect(result.headers.Authorization).toBe('Bearer custom-token');
      expect(tokenManager.getTokens).not.toHaveBeenCalled();
    });

    it('skips injection when no X-Username header', async () => {
      const tokenManager = createMockTokenManager();
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager }));
      const result = await interceptor.onRequest!(makeRequest());
      expect(result.headers.Authorization).toBeUndefined();
      expect(tokenManager.getTokens).not.toHaveBeenCalled();
    });

    it('skips injection when no tokens found for username', async () => {
      const tokenManager = createMockTokenManager();
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager }));
      const result = await interceptor.onRequest!(makeRequest({ 'X-Username': 'unknown' }));
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('skips injection for absolute URL targeting a foreign origin', async () => {
      const tokenManager = createMockTokenManager({ alice: { token: 'tok-alice', refreshToken: 'ref-alice' } });
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager }));
      const request = { url: 'https://evil.com/collect', method: 'GET', headers: { 'X-Username': 'alice' } };
      const result = await interceptor.onRequest!(request);
      expect(result.headers.Authorization).toBeUndefined();
      expect(tokenManager.getTokens).not.toHaveBeenCalled();
    });

    it('injects token for absolute URL matching trusted origin', async () => {
      const tokenManager = createMockTokenManager({ alice: { token: 'tok-alice', refreshToken: 'ref-alice' } });
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager }));
      const request = { url: 'https://api.example.com/v1/users', method: 'GET', headers: { 'X-Username': 'alice' } };
      const result = await interceptor.onRequest!(request);
      expect(result.headers.Authorization).toBe('Bearer tok-alice');
    });
  });

  describe('onError', () => {
    let refreshFn: ReturnType<typeof vi.fn>;
    let tokenManager: TokenManager;

    beforeEach(() => {
      refreshFn = vi.fn(() => Promise.resolve());
      tokenManager = createMockTokenManager({ alice: { token: 'tok', refreshToken: 'ref' } });
    });

    async function setupAndTriggerError(requestUrl = '/auth/credentials') {
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager, refreshFn }));
      await interceptor.onRequest!(makeRequest({ 'X-Username': 'alice' }));
      return interceptor.onError!(makeAuthError(requestUrl));
    }

    it('returns shouldRetry true after successful token refresh on AUTH_EXPIRED', async () => {
      const result = await setupAndTriggerError();
      expect(result.shouldRetry).toBe(true);
      expect(refreshFn).toHaveBeenCalledWith('alice');
    });

    it('clears tokens when refresh endpoint itself returns AUTH_EXPIRED', async () => {
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager, refreshFn }));
      // Simulate a request to the refresh endpoint where the interceptor injected auth
      await interceptor.onRequest!({
        url: '/auth/login/delegated', method: 'POST',
        headers: { 'X-Username': 'alice' },
      });
      const error = makeAuthError('/auth/login/delegated');
      const result = await interceptor.onError!(error);
      expect(result.shouldRetry).toBeUndefined();
      expect(tokenManager.clearTokens).toHaveBeenCalledWith('alice');
      expect(refreshFn).not.toHaveBeenCalled();
    });

    it('does not clear tokens for URLs that merely contain the delegated path', async () => {
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager, refreshFn }));
      await interceptor.onRequest!({
        url: '/auth/login/delegated-extended', method: 'POST',
        headers: { 'X-Username': 'alice' },
      });
      const error = makeAuthError('/auth/login/delegated-extended');
      const result = await interceptor.onError!(error);
      expect(result.shouldRetry).toBe(true);
      expect(tokenManager.clearTokens).not.toHaveBeenCalled();
      expect(refreshFn).toHaveBeenCalledWith('alice');
    });

    it('passes through non-AUTH_EXPIRED errors unchanged', async () => {
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager, refreshFn }));
      const error = new NetworkError({ code: 'NETWORK_TIMEOUT', message: 'Timeout', status: 408 });
      const result = await interceptor.onError!(error);
      expect(result).toBe(error);
      expect(refreshFn).not.toHaveBeenCalled();
    });

    it('deduplicates concurrent refresh calls for the same username', async () => {
      const refreshLocks = new Map<string, Promise<void>>();
      let resolveRefresh: () => void;
      const slowRefresh = vi.fn(() => new Promise<void>((resolve) => { resolveRefresh = resolve; }));
      const interceptor = createIdentityAuthInterceptor(createDeps({
        tokenManager, refreshFn: slowRefresh, refreshLocks,
      }));

      await interceptor.onRequest!({ url: '/endpoint-a', method: 'GET', headers: { 'X-Username': 'alice' } });
      await interceptor.onRequest!({ url: '/endpoint-b', method: 'GET', headers: { 'X-Username': 'alice' } });

      const promise1 = interceptor.onError!(makeAuthError('/endpoint-a'));
      const promise2 = interceptor.onError!(makeAuthError('/endpoint-b'));

      resolveRefresh!();
      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.shouldRetry).toBe(true);
      expect(result2.shouldRetry).toBe(true);
      expect(slowRefresh).toHaveBeenCalledTimes(1);
    });

    it('handles independent refresh calls for different usernames', async () => {
      const multiTokenManager = createMockTokenManager({
        alice: { token: 'tok-a', refreshToken: 'ref-a' },
        bob: { token: 'tok-b', refreshToken: 'ref-b' },
      });
      const interceptor = createIdentityAuthInterceptor(createDeps({
        tokenManager: multiTokenManager, refreshFn,
      }));

      await interceptor.onRequest!({ url: '/endpoint-a', method: 'GET', headers: { 'X-Username': 'alice' } });
      await interceptor.onRequest!({ url: '/endpoint-b', method: 'GET', headers: { 'X-Username': 'bob' } });

      await interceptor.onError!(makeAuthError('/endpoint-a'));
      await interceptor.onError!(makeAuthError('/endpoint-b'));

      expect(refreshFn).toHaveBeenCalledWith('alice');
      expect(refreshFn).toHaveBeenCalledWith('bob');
      expect(refreshFn).toHaveBeenCalledTimes(2);
    });

    it('returns original error when refresh fails', async () => {
      const failingRefresh = vi.fn(() => Promise.reject(new Error('refresh failed')));
      const interceptor = createIdentityAuthInterceptor(createDeps({
        tokenManager, refreshFn: failingRefresh,
      }));
      await interceptor.onRequest!(makeRequest({ 'X-Username': 'alice' }));
      const error = makeAuthError('/auth/credentials');
      const result = await interceptor.onError!(error);
      expect(result).toBe(error);
      expect(result.shouldRetry).toBeUndefined();
    });
  });

  describe('onResponse', () => {
    it('cleans up tracking map on successful response', async () => {
      const tokenManager = createMockTokenManager({ alice: { token: 'tok', refreshToken: 'ref' } });
      const refreshFn = vi.fn(() => Promise.resolve());
      const interceptor = createIdentityAuthInterceptor(createDeps({ tokenManager, refreshFn }));

      await interceptor.onRequest!(makeRequest({ 'X-Username': 'alice' }));
      await interceptor.onResponse!({ status: 200, headers: {}, body: {}, url: '/auth/credentials' });

      const error = makeAuthError('/auth/credentials');
      const result = await interceptor.onError!(error);
      expect(result.shouldRetry).toBeUndefined();
      expect(refreshFn).not.toHaveBeenCalled();
    });
  });
});
