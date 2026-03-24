import { Logger } from '@ion/diagnostics';
import type { HttpClient, HttpClientConfig, RequestOptions, RequestOptionsWithBody, UploadOptions } from './http-types';
import type { InterceptedRequest, InterceptedResponse } from './interceptor-types';
import { buildRequestUrl } from './url-builder';
import { createHttpsValidator } from './https-validator';
import { followRedirects } from './redirect-handler';
import { parseResponse, validateRequestBodySize } from './response-parser';
import { runRequestInterceptors, runResponseInterceptors, runErrorInterceptors } from './interceptor-pipeline';
import { executeWithRetry, parseRetryAfter } from './retry-handler';
import { NetworkError } from './network-error';
import { DEFAULT_RETRY_CONFIG } from './retry-types';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_REQUEST_BODY_SIZE = 50 * 1024 * 1024;

interface ClientInternals {
  config: Required<Pick<HttpClientConfig, 'baseUrl' | 'timeoutMs' | 'maxRedirects' | 'maxResponseSizeBytes' | 'maxRequestBodySizeBytes'>>;
  validateHttps: (url: string) => void;
  interceptors: HttpClientConfig['interceptors'];
  retryConfig: HttpClientConfig['retryConfig'];
}

interface RequestContext {
  internals: ClientInternals;
  method: string;
  url: string;
  options?: RequestOptionsWithBody | undefined;
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const internals = buildInternals(config);
  return {
    get: <T>(url: string, opts?: RequestOptions) => executeRequest<T>({ internals, method: 'GET', url, options: opts }),
    post: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'POST', url, options: opts }),
    put: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'PUT', url, options: opts }),
    patch: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'PATCH', url, options: opts }),
    delete: <T>(url: string, opts?: RequestOptions) => executeRequest<T>({ internals, method: 'DELETE', url, options: opts }),
    upload: <T>(url: string, formData: FormData, opts?: UploadOptions) => executeRequest<T>({ internals, method: 'POST', url, options: { ...opts, body: formData } }),
  };
}

function buildInternals(config: HttpClientConfig): ClientInternals {
  const isProduction = config.isProduction ?? false;
  return {
    config: {
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRedirects: config.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
      maxResponseSizeBytes: config.maxResponseSizeBytes ?? DEFAULT_MAX_RESPONSE_SIZE,
      maxRequestBodySizeBytes: config.maxRequestBodySizeBytes ?? DEFAULT_MAX_REQUEST_BODY_SIZE,
    },
    validateHttps: createHttpsValidator({ allowlist: config.httpsAllowlist ?? [], isProduction }),
    interceptors: config.interceptors,
    retryConfig: config.retryConfig,
  };
}

async function executeRequest<T>(context: RequestContext): Promise<T> {
  const { internals, method, options } = context;
  const url = buildRequestUrl({ baseUrl: internals.config.baseUrl, path: context.url, params: options?.params, query: options?.query });
  internals.validateHttps(url);
  if (options?.body && !(options.body instanceof FormData)) {
    validateRequestBodySize(options.body, internals.config.maxRequestBodySizeBytes);
  }
  return executeWithRetry({
    executeFn: () => executeSingleRequest<T>({ ...context, url }),
    retryConfig: internals.retryConfig ?? DEFAULT_RETRY_CONFIG,
    method,
    signal: options?.signal,
    retryable: options?.retryable,
  });
}

async function executeSingleRequest<T>(context: RequestContext): Promise<T> {
  const { internals, options } = context;
  const interceptedReq = await buildInterceptedRequest(context);
  const abortController = new AbortController();
  const timeoutMs = options?.timeoutMs ?? internals.config.timeoutMs;
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    linkExternalSignal(options?.signal, abortController);
    Logger.addBreadcrumb({ message: 'HTTP request started', category: 'network.http', data: { url: interceptedReq.url, method: context.method } });
    const response = await fetchWithRedirects(internals, interceptedReq, abortController);
    const parsedBody = await parseResponse<T>(response, { maxResponseSizeBytes: internals.config.maxResponseSizeBytes, abortController });
    const interceptedResp = await buildInterceptedResponse(internals, response, parsedBody);
    throwOnErrorStatus(response.status, interceptedResp);
    return interceptedResp.body as T;
  } catch (error) {
    throw await handleRequestError(internals, error, abortController);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function buildInterceptedRequest(context: RequestContext): Promise<InterceptedRequest> {
  const { internals, method, url, options } = context;
  const request: InterceptedRequest = { url, method, headers: options?.headers ?? {}, body: options?.body };
  if (!internals.interceptors?.length) return request;
  return runRequestInterceptors({ request, interceptors: internals.interceptors });
}

async function buildInterceptedResponse(
  internals: ClientInternals,
  response: Response,
  body: unknown,
): Promise<InterceptedResponse> {
  const intercepted: InterceptedResponse = {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
    url: response.url,
  };
  if (!internals.interceptors?.length) return intercepted;
  return runResponseInterceptors(internals.interceptors, intercepted);
}

async function fetchWithRedirects(
  internals: ClientInternals,
  request: InterceptedRequest,
  abortController: AbortController,
): Promise<Response> {
  const body = request.body instanceof FormData
    ? request.body
    : request.body ? JSON.stringify(request.body) : null;
  const fetchRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
    signal: abortController.signal,
    redirect: 'manual',
  });
  return followRedirects(
    { maxRedirects: internals.config.maxRedirects, originalUrl: request.url },
    fetch,
    fetchRequest,
  );
}

function linkExternalSignal(
  signal: AbortSignal | undefined,
  controller: AbortController,
): void {
  if (!signal) return;
  if (signal.aborted) { controller.abort(); return; }
  signal.addEventListener('abort', () => controller.abort(), { once: true });
}

function throwOnErrorStatus(
  status: number,
  response: InterceptedResponse,
): void {
  if (status >= 200 && status < 300) return;
  if (status === 401) throw new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status, responseBody: response.body });
  if (status === 403) throw new NetworkError({ code: 'FORBIDDEN', message: 'Forbidden', status, responseBody: response.body });
  if (status === 429) throw buildRateLimitError(status, response);
  if (status >= 400 && status < 500) throw new NetworkError({ code: 'CLIENT_ERROR', message: `Client error: ${status}`, status, responseBody: response.body });
  if (status >= 500) throw new NetworkError({ code: 'SERVER_ERROR', message: `Server error: ${status}`, status, responseBody: response.body });
}

function buildRateLimitError(
  status: number,
  response: InterceptedResponse,
): NetworkError {
  const header = response.headers['retry-after'];
  const retryAfterMs = header ? parseRetryAfter(header, 60_000) : null;
  return new NetworkError({
    code: 'RATE_LIMITED',
    message: 'Rate limited',
    status,
    responseBody: response.body,
    ...(retryAfterMs !== null ? { retryAfterMs } : {}),
  });
}

async function handleRequestError(
  internals: ClientInternals,
  error: unknown,
  abortController: AbortController,
): Promise<NetworkError> {
  if (error instanceof NetworkError) {
    if (internals.interceptors?.length) return runErrorInterceptors(internals.interceptors, error);
    return error;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    if (abortController.signal.reason === undefined) return new NetworkError({ code: 'NETWORK_TIMEOUT', message: 'Request timed out' });
    return new NetworkError({ code: 'REQUEST_ABORTED', message: 'Request aborted' });
  }
  return new NetworkError({ code: 'NETWORK_OFFLINE', message: (error as Error).message ?? 'Network error' });
}
