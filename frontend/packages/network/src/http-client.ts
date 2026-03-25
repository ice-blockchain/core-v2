import { Logger } from '@ion/diagnostics';
import type { HttpClient, HttpClientConfig, RequestOptions, RequestOptionsWithBody, UploadOptions } from './http-types';
import type { InterceptedRequest, InterceptedResponse } from './interceptor-types';
import type { UploadTransport } from './platform/upload-transport';
import type { RequestQueue } from './queue-types';
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
  uploadTransport?: UploadTransport | undefined;
  requestQueue?: RequestQueue | undefined;
}

interface RequestContext {
  internals: ClientInternals;
  method: string;
  url: string;
  options?: RequestOptionsWithBody | undefined;
  authRetried?: boolean | undefined;
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const internals = buildInternals(config);
  return {
    get: <T>(url: string, opts?: RequestOptions) => executeRequest<T>({ internals, method: 'GET', url, options: opts }),
    post: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'POST', url, options: opts }),
    put: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'PUT', url, options: opts }),
    patch: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'PATCH', url, options: opts }),
    delete: <T>(url: string, opts?: RequestOptions) => executeRequest<T>({ internals, method: 'DELETE', url, options: opts }),
    upload: <T>(url: string, formData: FormData, opts?: UploadOptions) => executeUploadRequest<T>({ internals, url, formData, options: opts }),
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
    uploadTransport: config.uploadTransport,
    requestQueue: config.requestQueue,
  };
}

async function executeRequest<T>(context: RequestContext): Promise<T> {
  const { internals, method, options } = context;
  const url = buildRequestUrl({ baseUrl: internals.config.baseUrl, path: context.url, params: options?.params, query: options?.query });
  internals.validateHttps(url);
  if (options?.body && !(options.body instanceof FormData)) {
    validateRequestBodySize(options.body, internals.config.maxRequestBodySizeBytes);
  }
  try {
    return await executeWithRetry({
      executeFn: () => executeSingleRequest<T>({ ...context, url }),
      retryConfig: internals.retryConfig ?? DEFAULT_RETRY_CONFIG,
      method,
      signal: options?.signal,
      retryable: options?.retryable,
    });
  } catch (error) {
    if (shouldEnqueue(internals, error, options)) {
      await enqueueFailedRequest(internals, context, url);
    }
    throw error;
  }
}

interface UploadContext {
  internals: ClientInternals;
  url: string;
  formData: FormData;
  options?: UploadOptions | undefined;
}

async function executeUploadRequest<T>(context: UploadContext): Promise<T> {
  const { internals, url, formData, options } = context;
  if (!internals.uploadTransport) {
    return executeRequest<T>({ internals, method: 'POST', url, options: { ...options, body: formData } });
  }
  const fullUrl = buildRequestUrl({ baseUrl: internals.config.baseUrl, path: url, params: options?.params, query: options?.query });
  internals.validateHttps(fullUrl);
  const interceptedReq = await buildInterceptedRequest({ internals, method: 'POST', url: fullUrl, options });
  return internals.uploadTransport.upload<T>({
    url: interceptedReq.url,
    formData,
    headers: interceptedReq.headers,
    onProgress: options?.onProgress,
    signal: options?.signal,
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
    const handled = await handleRequestError(internals, error, abortController);
    if (handled.shouldRetry && !context.authRetried) {
      return executeSingleRequest<T>({ ...context, authRetried: true });
    }
    throw handled;
  } finally {
    clearTimeout(timeoutId);
  }
}

function shouldEnqueue(
  internals: ClientInternals,
  error: unknown,
  options?: RequestOptionsWithBody,
): boolean {
  if (!internals.requestQueue || !options?.offlineQueue) return false;
  return error instanceof NetworkError && error.code === 'NETWORK_OFFLINE';
}

async function enqueueFailedRequest(
  internals: ClientInternals,
  context: RequestContext,
  url: string,
): Promise<void> {
  await internals.requestQueue!.enqueue({
    method: context.method,
    url,
    body: (context.options as RequestOptionsWithBody | undefined)?.body,
    headers: context.options?.headers,
    enqueuedAt: Date.now(),
    timeToLiveMs: 3_600_000,
  });
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
  if (status === 401) throw new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status, responseBody: response.body, requestUrl: response.url });
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
  if (error instanceof TypeError) {
    return new NetworkError({ code: 'NETWORK_OFFLINE', message: error.message ?? 'Network error' });
  }
  return new NetworkError({ code: 'CLIENT_ERROR', message: (error as Error).message ?? 'Unexpected error' });
}
