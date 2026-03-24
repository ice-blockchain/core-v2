import { describe, it, expect, vi } from 'vitest';
import { createBearerAuthInterceptor } from './bearer-auth-interceptor';
import { createNetworkEventEmitter } from './network-event-emitter';
import { NetworkError } from './network-error';
import type { BearerAuthInterceptorConfig } from './auth-types';
import type { InterceptedRequest } from './interceptor-types';

vi.mock('@ion/diagnostics', () => ({
  Logger: { debug: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

function createMockConfig(): BearerAuthInterceptorConfig {
  return {
    tokenStorage: {
      getAccessToken: vi.fn().mockResolvedValue('access-token'),
      getRefreshToken: vi.fn().mockResolvedValue('refresh-token'),
      setTokens: vi.fn().mockResolvedValue(undefined),
      clearTokens: vi.fn().mockResolvedValue(undefined),
    },
    refreshEndpoint: '/auth/refresh',
    refreshFn: vi.fn().mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
    eventEmitter: createNetworkEventEmitter(),
  };
}

const baseRequest: InterceptedRequest = {
  url: 'https://api.example.com/users',
  method: 'GET',
  headers: {},
};

describe('BearerAuthInterceptor onRequest', () => {
  it('injects Authorization header', async () => {
    const config = createMockConfig();
    const interceptor = createBearerAuthInterceptor(config);
    const result = await interceptor.onRequest!(baseRequest);
    expect(result.headers.Authorization).toBe('Bearer access-token');
  });

  it('skips header when no token', async () => {
    const config = createMockConfig();
    (config.tokenStorage.getAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const interceptor = createBearerAuthInterceptor(config);
    const result = await interceptor.onRequest!(baseRequest);
    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe('BearerAuthInterceptor refresh flow', () => {
  it('refreshes token on AUTH_EXPIRED error', async () => {
    const config = createMockConfig();
    const interceptor = createBearerAuthInterceptor(config);
    const error = new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status: 401 });
    await interceptor.onError!(error);
    expect(config.refreshFn).toHaveBeenCalledWith('refresh-token');
    expect(config.tokenStorage.setTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
  });

  it('does not refresh on non-auth errors', async () => {
    const config = createMockConfig();
    const interceptor = createBearerAuthInterceptor(config);
    const error = new NetworkError({ code: 'SERVER_ERROR', message: 'fail', status: 500 });
    await interceptor.onError!(error);
    expect(config.refreshFn).not.toHaveBeenCalled();
  });
});

describe('BearerAuthInterceptor concurrent refresh', () => {
  it('deduplicates concurrent refresh calls', async () => {
    const config = createMockConfig();
    let resolveRefresh!: (v: { accessToken: string; refreshToken: string }) => void;
    (config.refreshFn as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => { resolveRefresh = resolve; }),
    );
    const interceptor = createBearerAuthInterceptor(config);
    const error = new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status: 401 });
    const promise1 = interceptor.onError!(error);
    const promise2 = interceptor.onError!(error);
    const promise3 = interceptor.onError!(error);
    resolveRefresh({ accessToken: 'new', refreshToken: 'new' });
    await Promise.all([promise1, promise2, promise3]);
    expect(config.refreshFn).toHaveBeenCalledTimes(1);
  });
});

describe('BearerAuthInterceptor refresh failure', () => {
  it('emits auth-expired on refresh failure', async () => {
    const config = createMockConfig();
    (config.refreshFn as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    const handler = vi.fn();
    config.eventEmitter.on('auth-expired', handler);
    const interceptor = createBearerAuthInterceptor(config);
    const error = new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status: 401 });
    await interceptor.onError!(error);
    expect(handler).toHaveBeenCalled();
    expect(config.tokenStorage.clearTokens).toHaveBeenCalled();
  });

  it('emits auth-token-refreshed on success', async () => {
    const config = createMockConfig();
    const handler = vi.fn();
    config.eventEmitter.on('auth-token-refreshed', handler);
    const interceptor = createBearerAuthInterceptor(config);
    const error = new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status: 401 });
    await interceptor.onError!(error);
    expect(handler).toHaveBeenCalled();
  });
});

describe('BearerAuthInterceptor shouldRetry signal', () => {
  it('returns error with shouldRetry after successful refresh', async () => {
    const config = createMockConfig();
    const interceptor = createBearerAuthInterceptor(config);
    const error = new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status: 401 });
    const result = await interceptor.onError!(error);
    expect(result.shouldRetry).toBe(true);
  });

  it('does not set shouldRetry when refresh fails', async () => {
    const config = createMockConfig();
    (config.refreshFn as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    const interceptor = createBearerAuthInterceptor(config);
    const error = new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status: 401 });
    const result = await interceptor.onError!(error);
    expect(result.shouldRetry).toBeUndefined();
  });
});

describe('BearerAuthInterceptor refreshEndpoint skip', () => {
  it('skips refresh when error URL matches refresh endpoint', async () => {
    const config = createMockConfig();
    const handler = vi.fn();
    config.eventEmitter.on('auth-expired', handler);
    const interceptor = createBearerAuthInterceptor(config);
    const error = new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status: 401, requestUrl: 'https://api.example.com/auth/refresh' });
    await interceptor.onError!(error);
    expect(config.refreshFn).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });
});
