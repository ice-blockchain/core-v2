import { Logger } from '@ion/diagnostics';
import type { Interceptor, InterceptedRequest } from './interceptor-types';
import type { BearerAuthInterceptorConfig } from './auth-types';
import { NetworkError } from './network-error';

export function createBearerAuthInterceptor(
  config: BearerAuthInterceptorConfig,
): Interceptor {
  let refreshPromise: Promise<void> | null = null;

  return {
    name: 'bearer-auth',
    onRequest: (request) => injectAuthHeader(config, request),
    onError: (error) => handleAuthError(error, {
      config,
      getPromise: () => refreshPromise,
      setPromise: (p) => { refreshPromise = p; },
    }),
  };
}

async function injectAuthHeader(
  config: BearerAuthInterceptorConfig,
  request: InterceptedRequest,
): Promise<InterceptedRequest> {
  const token = await config.tokenStorage.getAccessToken();
  if (!token) return request;
  return {
    ...request,
    headers: { ...request.headers, Authorization: `Bearer ${token}` },
  };
}

interface RefreshContext {
  config: BearerAuthInterceptorConfig;
  getPromise: () => Promise<void> | null;
  setPromise: (p: Promise<void> | null) => void;
}

async function handleAuthError(
  error: NetworkError,
  context: RefreshContext,
): Promise<NetworkError> {
  if (error.code !== 'AUTH_EXPIRED') return error;
  if (isRefreshEndpoint(error, context.config.refreshEndpoint)) {
    return await emitExpiredAndReturn(error, context.config);
  }
  try {
    await executeOrAwaitRefresh(context);
    return new NetworkError({
      code: 'AUTH_EXPIRED',
      message: error.message,
      status: error.status,
      shouldRetry: true,
    });
  } catch {
    return error;
  }
}

function isRefreshEndpoint(
  error: NetworkError,
  endpoint: string,
): boolean {
  return error.requestUrl?.includes(endpoint) ?? false;
}

async function emitExpiredAndReturn(
  error: NetworkError,
  config: BearerAuthInterceptorConfig,
): Promise<NetworkError> {
  await config.tokenStorage.clearTokens();
  config.eventEmitter.emit({ type: 'auth-expired' });
  return error;
}

async function executeOrAwaitRefresh(
  context: RefreshContext,
): Promise<void> {
  const existing = context.getPromise();
  if (existing) { await existing; return; }
  const promise = performRefresh(context.config);
  context.setPromise(promise);
  try {
    await promise;
  } finally {
    context.setPromise(null);
  }
}

async function performRefresh(
  config: BearerAuthInterceptorConfig,
): Promise<void> {
  const refreshToken = await config.tokenStorage.getRefreshToken();
  if (!refreshToken) {
    await config.tokenStorage.clearTokens();
    config.eventEmitter.emit({ type: 'auth-expired' });
    throw new NetworkError({ code: 'AUTH_EXPIRED', message: 'No refresh token available' });
  }
  try {
    const result = await config.refreshFn(refreshToken);
    await config.tokenStorage.setTokens(result.accessToken, result.refreshToken);
    config.eventEmitter.emit({ type: 'auth-token-refreshed' });
    Logger.debug('Auth token refreshed', { tag: 'network' });
  } catch {
    await config.tokenStorage.clearTokens();
    config.eventEmitter.emit({ type: 'auth-expired' });
    Logger.warning('Auth refresh failed, tokens cleared', { tag: 'network' });
    throw new NetworkError({ code: 'AUTH_EXPIRED', message: 'Token refresh failed' });
  }
}
