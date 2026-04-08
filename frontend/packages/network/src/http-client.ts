import type { HttpClient, HttpClientConfig, HttpResponse, RequestOptions, RequestOptionsWithBody, UploadOptions } from './http-types';
import type { InterceptedRequest, InterceptedResponse } from './interceptor-types';
import type { UploadProgress } from './shared-types';
import type { RequestQueue } from './queue-types';
import type { Transport } from './transport-types';
import { interpolatePathParams } from './url-builder';
import { createHttpsValidator } from './https-validator';
import { runRequestInterceptors, runErrorInterceptors } from './interceptor-pipeline';
import { executeTransportRequest } from './transport-executor';
import { createAxiosTransport } from './axios-transport';
import { Logger } from '@ion/diagnostics';
import { NetworkError } from './network-error';
import { DEFAULT_RETRY_CONFIG } from './retry-types';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_REQUEST_BODY_SIZE = 50 * 1024 * 1024;

interface ClientInternals {
  config: { timeoutMs: number; maxRequestBodySizeBytes: number };
  baseUrl?: string | undefined;
  defaultHeaders?: Record<string, string> | undefined;
  transport: Transport;
  interceptors: HttpClientConfig['interceptors'];
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
    head: <T>(url: string, opts?: RequestOptions) => executeRequest<T>({ internals, method: 'HEAD', url, options: opts }),
    post: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'POST', url, options: opts }),
    put: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'PUT', url, options: opts }),
    patch: <T>(url: string, opts?: RequestOptionsWithBody) => executeRequest<T>({ internals, method: 'PATCH', url, options: opts }),
    delete: <T>(url: string, opts?: RequestOptions) => executeRequest<T>({ internals, method: 'DELETE', url, options: opts }),
    upload: <T>(url: string, formData: FormData, opts?: UploadOptions) =>
      executeRequest<T>({ internals, method: 'POST', url, options: { ...opts, body: formData }, onProgress: opts?.onProgress }),
  };
}

function buildInternals(config: HttpClientConfig): ClientInternals {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRequestBodySizeBytes = config.maxRequestBodySizeBytes ?? DEFAULT_MAX_REQUEST_BODY_SIZE;
  const isProduction = config.isProduction ?? false;
  if (!config.transport) {
    const validateHttps = createHttpsValidator({ allowlist: config.httpsAllowlist ?? [], isProduction });
    if (config.baseUrl) validateHttps(config.baseUrl);
  }
  const transport = config.transport ?? createAxiosTransport({
    baseUrl: config.baseUrl,
    maxResponseSizeBytes: config.maxResponseSizeBytes ?? DEFAULT_MAX_RESPONSE_SIZE,
    maxBodyLength: maxRequestBodySizeBytes,
    retryConfig: config.retryConfig ?? DEFAULT_RETRY_CONFIG,
  });
  const baseUrl = config.baseUrl;
  return { config: { timeoutMs, maxRequestBodySizeBytes }, baseUrl, defaultHeaders: config.headers, transport, interceptors: config.interceptors, requestQueue: config.requestQueue };
}

async function executeRequest<T>(context: RequestContext): Promise<HttpResponse<T>> {
  const { internals, options } = context;
  const path = interpolatePathParams(context.url, options?.params);
  validateRequestBodySize(options?.body, internals.config.maxRequestBodySizeBytes);
  try {
    return await executeSingleRequest<T>({ ...context, url: path });
  } catch (error) {
    if (shouldEnqueue(internals, error, options)) {
      await enqueueFailedRequest(internals, context, path);
    }
    throw error;
  }
}

async function executeSingleRequest<T>(context: RequestContext): Promise<HttpResponse<T>> {
  const { internals, options } = context;
  const req = await buildInterceptedRequest(context);
  const timeoutMs = options?.timeoutMs ?? internals.config.timeoutMs;
  try {
    const response = await executeTransportRequest<T>({
      transport: internals.transport, request: req, timeoutMs,
      interceptors: internals.interceptors, signal: options?.signal,
      query: options?.query, onProgress: mapProgress(context.onProgress),
    });
    throwOnErrorStatus(response.status, { ...response, url: req.url, body: response.body });
    return response;
  } catch (error) {
    const handled = await handleError(internals, error);
    if (handled.shouldRetry && !context.authRetried) {
      return executeSingleRequest<T>({ ...context, authRetried: true });
    }
    throw handled;
  }
}

function mapProgress(onProgress?: (p: UploadProgress) => void) {
  if (!onProgress) return undefined;
  return (p: { loaded: number; total: number }) => {
    const percentage = p.total > 0 ? Math.round((p.loaded / p.total) * 100) : 0;
    onProgress({ bytesSent: p.loaded, bytesTotal: p.total, percentage });
  };
}

async function buildInterceptedRequest(context: RequestContext): Promise<InterceptedRequest> {
  const { internals, method, url, options } = context;
  const fullUrl = internals.baseUrl ? `${internals.baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url;
  const request: InterceptedRequest = { url: fullUrl, method, headers: { ...internals.defaultHeaders, ...options?.headers }, body: options?.body };
  if (!internals.interceptors?.length) return request;
  return runRequestInterceptors({ request, interceptors: internals.interceptors });
}

function throwOnErrorStatus(status: number, response: InterceptedResponse): void {
  if (status >= 200 && status < 300) return;
  if (status >= 400) Logger.warning('HTTP error response', { tag: 'network', data: { status, url: response.url } });
  if (status === 401) throw new NetworkError({ code: 'AUTH_EXPIRED', message: 'Unauthorized', status, responseBody: response.body, requestUrl: response.url });
  if (status === 403) throw new NetworkError({ code: 'FORBIDDEN', message: 'Forbidden', status, responseBody: response.body });
  if (status >= 400 && status < 500) throw new NetworkError({ code: 'CLIENT_ERROR', message: `Client error: ${status}`, status, responseBody: response.body });
  if (status >= 500) throw new NetworkError({ code: 'SERVER_ERROR', message: `Server error: ${status}`, status, responseBody: response.body });
}

async function handleError(internals: ClientInternals, error: unknown): Promise<NetworkError> {
  if (error instanceof NetworkError) {
    if (internals.interceptors?.length) return runErrorInterceptors(internals.interceptors, error);
    return error;
  }
  const networkError = new NetworkError({ code: 'CLIENT_ERROR', message: (error as Error).message ?? 'Unexpected error' });
  if (internals.interceptors?.length) return runErrorInterceptors(internals.interceptors, networkError);
  return networkError;
}

function validateRequestBodySize(body: unknown, maxSize: number): void {
  if (body === undefined || body === null || body instanceof FormData) return;
  const serialized = JSON.stringify(body);
  const byteSize = new TextEncoder().encode(serialized).byteLength;
  if (byteSize > maxSize) {
    throw new NetworkError({ code: 'CLIENT_ERROR', message: `Request body exceeds max size of ${maxSize} bytes (got ${byteSize})` });
  }
}

function shouldEnqueue(internals: ClientInternals, error: unknown, options?: RequestOptionsWithBody): boolean {
  if (!internals.requestQueue || !options?.offlineQueue) return false;
  return error instanceof NetworkError && error.code === 'NETWORK_OFFLINE';
}

async function enqueueFailedRequest(internals: ClientInternals, context: RequestContext, url: string): Promise<void> {
  await internals.requestQueue!.enqueue({
    method: context.method, url,
    body: (context.options as RequestOptionsWithBody | undefined)?.body,
    headers: context.options?.headers, enqueuedAt: Date.now(), timeToLiveMs: 3_600_000,
  });
}
