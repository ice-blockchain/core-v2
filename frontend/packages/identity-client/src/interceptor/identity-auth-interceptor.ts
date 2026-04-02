import type { Interceptor, InterceptedRequest, InterceptedResponse } from '@ion/network';
import { NetworkError } from '@ion/network';
import { Logger } from '@ion/diagnostics';
import type { TokenManager } from '../token/token-manager';

interface IdentityAuthInterceptorDeps {
  tokenManager: TokenManager;
  refreshFn: (username: string) => Promise<void>;
  refreshLocks: Map<string, Promise<void>>;
}

export function createIdentityAuthInterceptor(
  deps: IdentityAuthInterceptorDeps,
): Interceptor {
  const usernameByRequest = new Map<string, string>();

  return {
    name: 'identity-auth',
    onRequest: (request) => injectAuthHeader(deps, request, usernameByRequest),
    onResponse: (response) => cleanupTracking(response, usernameByRequest),
    onError: (error) => handleAuthError(error, deps, usernameByRequest),
  };
}

function requestKey(method: string, url: string): string {
  return `${method}:${url}`;
}

async function injectAuthHeader(
  deps: IdentityAuthInterceptorDeps,
  request: InterceptedRequest,
  usernameByRequest: Map<string, string>,
): Promise<InterceptedRequest> {
  if (request.headers.Authorization) return request;
  const username = request.headers['X-Username'];
  if (!username) return request;
  const tokens = await deps.tokenManager.getTokens(username);
  if (!tokens) return request;
  usernameByRequest.set(requestKey(request.method, request.url), username);
  return {
    ...request,
    headers: { ...request.headers, Authorization: `Bearer ${tokens.token}` },
  };
}

async function cleanupTracking(
  response: InterceptedResponse,
  usernameByRequest: Map<string, string>,
): Promise<InterceptedResponse> {
  if (response.url) {
    for (const [key] of usernameByRequest) {
      if (key === response.url || key.endsWith(`:${response.url}`)) {
        usernameByRequest.delete(key);
        break;
      }
    }
  }
  return response;
}

function extractUsername(
  error: NetworkError,
  usernameByRequest: Map<string, string>,
): string | null {
  if (!error.requestUrl) return null;
  for (const [key, username] of usernameByRequest) {
    if (key === error.requestUrl || key.endsWith(`:${error.requestUrl}`)) {
      usernameByRequest.delete(key);
      return username;
    }
  }
  return null;
}

async function handleAuthError(
  error: NetworkError,
  deps: IdentityAuthInterceptorDeps,
  usernameByRequest: Map<string, string>,
): Promise<NetworkError> {
  if (error.code !== 'AUTH_EXPIRED') return error;
  const username = extractUsername(error, usernameByRequest);
  if (!username) return error;
  if (error.requestUrl?.endsWith('/auth/login/delegated')) {
    await deps.tokenManager.clearTokens(username);
    return error;
  }
  try {
    await deduplicatedRefresh(username, deps);
    return new NetworkError({
      code: 'AUTH_EXPIRED',
      message: error.message,
      status: error.status,
      shouldRetry: true,
    });
  } catch (refreshError) {
    Logger.error('Token refresh failed', { tag: 'identity-auth-interceptor', error: refreshError instanceof Error ? refreshError : new Error(String(refreshError)), data: { username } });
    return error;
  }
}

async function deduplicatedRefresh(
  username: string,
  deps: IdentityAuthInterceptorDeps,
): Promise<void> {
  const existing = deps.refreshLocks.get(username);
  if (existing) { await existing; return; }
  const promise = deps.refreshFn(username);
  deps.refreshLocks.set(username, promise);
  try { await promise; } finally { deps.refreshLocks.delete(username); }
}
