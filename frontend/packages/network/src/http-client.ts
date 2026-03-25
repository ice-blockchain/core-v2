import axios from 'axios';
import type { AxiosInstance, AxiosProgressEvent, AxiosResponse } from 'axios';
import { Logger } from '@ion/diagnostics';
import type { HttpClient, HttpClientConfig, RequestOptions, RequestOptionsWithBody, UploadOptions } from './http-types';
import type { InterceptedRequest, InterceptedResponse } from './interceptor-types';
import type { UploadProgress } from './shared-types';
import type { RequestQueue } from './queue-types';
import { interpolatePathParams } from './url-builder';
import { createHttpsValidator } from './https-validator';
import { runRequestInterceptors, runResponseInterceptors, runErrorInterceptors } from './interceptor-pipeline';
import { executeWithRetry, parseRetryAfter } from './retry-handler';
import { NetworkError } from './network-error';
import { DEFAULT_RETRY_CONFIG } from './retry-types';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_REQUEST_BODY_SIZE = 50 * 1024 * 1024;

interface ClientInternals {
  config: { timeoutMs: number; maxRequestBodySizeBytes: number };
  axiosInstance: AxiosInstance;
  interceptors: HttpClientConfig['interceptors'];
  retryConfig: HttpClientConfig['retryConfig'];
  requestQueue?: RequestQueue | undefined;
}

interface RequestContext {
  internals: ClientInternals;
  method: string;
  url: string;
  options?: RequestOptionsWithBody | undefined;
  authRetried?: boolean | undefined;
  onProgress?: ((progress: UploadProgress) => void) | undefined;
}

export function createHttpClient(config: HttpClientConfig): HttpClient {
  const internals = buildInternals(config);
  return {
    get: <T>(url: string, opts?: RequestOptions) => executeRequest<T>({ internals, method: 'GET', url, options: opts }),
    post: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'POST', url, options: opts }),
    put: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'PUT', url, options: opts }),
    patch: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'PATCH', url, options: opts }),
    delete: <T>(url: string, opts?: RequestOptions) => executeRequest<T>({ internals, method: 'DELETE', url, options: opts }),
    upload: <T>(url: string, formData: FormData, opts?: UploadOptions) =>
      executeRequest<T>({ internals, method: 'POST', url, options: { ...opts, body: formData }, onProgress: opts?.onProgress }),
  };
}

function buildInternals(config: HttpClientConfig): ClientInternals {
  const isProduction = config.isProduction ?? false;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseSizeBytes = config.maxResponseSizeBytes ?? DEFAULT_MAX_RESPONSE_SIZE;
  const maxRequestBodySizeBytes = config.maxRequestBodySizeBytes ?? DEFAULT_MAX_REQUEST_BODY_SIZE;
  const validateHttps = createHttpsValidator({ allowlist: config.httpsAllowlist ?? [], isProduction });
  validateHttps(config.baseUrl);
  return {
    config: { timeoutMs, maxRequestBodySizeBytes },
    axiosInstance: axios.create({
      baseURL: config.baseUrl,
      validateStatus: () => true,
      maxContentLength: maxResponseSizeBytes,
      maxBodyLength: maxRequestBodySizeBytes,
      transitional: { clarifyTimeoutError: true },
    }),
    interceptors: config.interceptors,
    retryConfig: config.retryConfig,
    requestQueue: config.requestQueue,
  };
}

async function executeRequest<T>(context: RequestContext): Promise<T> {
  const { internals, method, options } = context;
  const path = interpolatePathParams(context.url, options?.params);
  validateRequestBodySize(options?.body, internals.config.maxRequestBodySizeBytes);
  try {
    return await executeWithRetry({
      executeFn: () => executeSingleRequest<T>({ ...context, url: path }),
      retryConfig: internals.retryConfig ?? DEFAULT_RETRY_CONFIG,
      method,
      signal: options?.signal,
      retryable: options?.retryable,
    });
  } catch (error) {
    if (shouldEnqueue(internals, error, options)) {
      await enqueueFailedRequest(internals, context, path);
    }
    throw error;
  }
}

async function executeSingleRequest<T>(context: RequestContext): Promise<T> {
  const { internals, options } = context;
  const interceptedReq = await buildInterceptedRequest(context);
  const timeoutMs = options?.timeoutMs ?? internals.config.timeoutMs;
  Logger.addBreadcrumb({ message: 'HTTP request started', category: 'network.http', data: { url: interceptedReq.url, method: context.method } });
  try {
    const response = await internals.axiosInstance.request({
      url: interceptedReq.url,
      method: interceptedReq.method,
      headers: interceptedReq.headers,
      data: interceptedReq.body,
      timeout: timeoutMs,
      ...(options?.signal ? { signal: options.signal } : {}),
      ...(options?.query ? { params: options.query } : {}),
      ...(context.onProgress ? { onUploadProgress: buildProgressHandler(context.onProgress) } : {}),
    });
    const parsedBody = parseResponseData<T>(response);
    const interceptedResp = await buildInterceptedResponse(internals, response, parsedBody);
    throwOnErrorStatus(response.status, interceptedResp);
    return interceptedResp.body as T;
  } catch (error) {
    const handled = await handleError(internals, error);
    if (handled.shouldRetry && !context.authRetried) {
      return executeSingleRequest<T>({ ...context, authRetried: true });
    }
    throw handled;
  }
}

function buildProgressHandler(onProgress: (progress: UploadProgress) => void): (event: AxiosProgressEvent) => void {
  return (event) => {
    if (!event.total) return;
    onProgress({ bytesSent: event.loaded ?? 0, bytesTotal: event.total, percentage: Math.round(((event.loaded ?? 0) / event.total) * 100) });
  };
}

async function buildInterceptedRequest(context: RequestContext): Promise<InterceptedRequest> {
  const { internals, method, url, options } = context;
  const request: InterceptedRequest = { url, method, headers: options?.headers ?? {}, body: options?.body };
  if (!internals.interceptors?.length) return request;
  return runRequestInterceptors({ request, interceptors: internals.interceptors });
}

async function buildInterceptedResponse(
  internals: ClientInternals,
  response: AxiosResponse,
  body: unknown,
): Promise<InterceptedResponse> {
  const intercepted: InterceptedResponse = {
    status: response.status,
    headers: { ...response.headers } as Record<string, string>,
    body,
    url: String(response.config.url ?? ''),
  };
  if (!internals.interceptors?.length) return intercepted;
  return runResponseInterceptors(internals.interceptors, intercepted);
}

function parseResponseData<T>(response: AxiosResponse): T {
  if (response.status === 204) return undefined as T;
  const contentType: string = response.headers['content-type'] ?? '';
  rejectNonJsonContentType(contentType, response.data);
  if (typeof response.data === 'string') {
    const suffix = contentType ? ` (content-type: ${contentType})` : '';
    throw new NetworkError({ code: 'PARSE_ERROR', message: `Failed to parse response as JSON${suffix}`, rawBody: response.data });
  }
  if (contentType && !contentType.includes('application/json')) {
    Logger.warning('Unexpected content type, attempting JSON parse', { tag: 'network', data: { contentType } });
  }
  return response.data as T;
}

function rejectNonJsonContentType(contentType: string, data: unknown): void {
  if (contentType.includes('text/html')) {
    throw new NetworkError({ code: 'PARSE_ERROR', message: 'Received HTML response instead of JSON', rawBody: String(data) });
  }
  if (contentType.includes('text/plain')) {
    throw new NetworkError({ code: 'PARSE_ERROR', message: 'Received text/plain response instead of JSON', rawBody: String(data) });
  }
}

function throwOnErrorStatus(status: number, response: InterceptedResponse): void {
  if (status >= 200 && status < 300) return;
  if (status === 401) throw new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status, responseBody: response.body, requestUrl: response.url });
  if (status === 403) throw new NetworkError({ code: 'FORBIDDEN', message: 'Forbidden', status, responseBody: response.body });
  if (status === 429) throw buildRateLimitError(status, response);
  if (status >= 400 && status < 500) throw new NetworkError({ code: 'CLIENT_ERROR', message: `Client error: ${status}`, status, responseBody: response.body });
  if (status >= 500) throw new NetworkError({ code: 'SERVER_ERROR', message: `Server error: ${status}`, status, responseBody: response.body });
}

function buildRateLimitError(status: number, response: InterceptedResponse): NetworkError {
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

async function handleError(internals: ClientInternals, error: unknown): Promise<NetworkError> {
  if (error instanceof NetworkError) {
    if (internals.interceptors?.length) return runErrorInterceptors(internals.interceptors, error);
    return error;
  }
  return mapAxiosError(error);
}

function mapAxiosError(error: unknown): NetworkError {
  if (axios.isCancel(error)) {
    return new NetworkError({ code: 'REQUEST_ABORTED', message: 'Request aborted' });
  }
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new NetworkError({ code: 'NETWORK_TIMEOUT', message: 'Request timed out' });
    }
    if (error.code === 'ERR_NETWORK') {
      return new NetworkError({ code: 'NETWORK_OFFLINE', message: error.message ?? 'Network error' });
    }
    return new NetworkError({ code: 'CLIENT_ERROR', message: error.message ?? 'Request failed' });
  }
  if (error instanceof TypeError) {
    return new NetworkError({ code: 'NETWORK_OFFLINE', message: error.message ?? 'Network error' });
  }
  return new NetworkError({ code: 'CLIENT_ERROR', message: (error as Error).message ?? 'Unexpected error' });
}

function validateRequestBodySize(body: unknown, maxSize: number): void {
  if (body === undefined || body === null || body instanceof FormData) return;
  const serialized = JSON.stringify(body);
  const byteSize = new TextEncoder().encode(serialized).byteLength;
  if (byteSize > maxSize) {
    throw new NetworkError({
      code: 'CLIENT_ERROR',
      message: `Request body exceeds max size of ${maxSize} bytes (got ${byteSize})`,
    });
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
