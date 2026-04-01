import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { Logger } from '@ion/diagnostics';
import type { Transport, TransportRequest, TransportResponse } from './transport-types';
import type { RetryConfig } from './retry-types';
import { NetworkError } from './network-error';

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT']);

interface AxiosTransportConfig {
  baseUrl: string;
  maxResponseSizeBytes: number;
  maxBodyLength: number;
  retryConfig: RetryConfig;
}

export function createAxiosTransport(config: AxiosTransportConfig): Transport {
  const instance = createInstance(config);
  configureRetry(instance, config.retryConfig);
  return { request: (req) => executeRequest(instance, req), upload: notSupported, download: notSupported };
}

async function notSupported(): Promise<never> {
  throw new NetworkError({ code: 'CLIENT_ERROR', message: 'Operation not supported by default transport' });
}

async function executeRequest<T>(instance: AxiosInstance, req: TransportRequest): Promise<TransportResponse<T>> {
  try {
    const response = await instance.request({
      url: req.url, method: req.method, headers: req.headers ?? {}, data: req.body,
      ...(req.timeoutMs !== undefined ? { timeout: req.timeoutMs } : {}),
      ...(req.signal ? { signal: req.signal } : {}), ...(req.query ? { params: req.query } : {}),
      ...(req.onProgress ? { onUploadProgress: buildProgressHandler(req.onProgress) } : {}),
      'axios-retry': { retryCondition: buildRetryCondition(req.method) },
    });
    return { status: response.status, headers: flattenHeaders(response), body: parseResponseData<T>(response) };
  } catch (error) {
    throw mapToNetworkError(error);
  }
}

function createInstance(config: AxiosTransportConfig): AxiosInstance {
  return axios.create({
    baseURL: config.baseUrl,
    validateStatus: (status) => !(status >= 500 || status === 429),
    maxContentLength: config.maxResponseSizeBytes,
    maxBodyLength: config.maxBodyLength,
    transitional: { clarifyTimeoutError: true },
  });
}

function configureRetry(instance: AxiosInstance, retryConfig: RetryConfig): void {
  axiosRetry(instance, {
    retries: retryConfig.maxRetries,
    shouldResetTimeout: true,
    retryDelay: (retryCount, error) => {
      const retryMs = extractRetryAfterMs(error, retryConfig.maxDelayMs);
      if (retryMs !== null) return retryMs;
      const exponential = Math.min(retryConfig.baseDelayMs * Math.pow(2, retryCount), retryConfig.maxDelayMs);
      return exponential + Math.random() * retryConfig.jitterFactor * exponential;
    },
    retryCondition: () => true,
  });
}

function extractRetryAfterMs(error: AxiosError, maxDelayMs: number): number | null {
  if (error?.response?.status !== 429) return null;
  const header = error.response.headers['retry-after'] as string | undefined;
  if (!header) return null;
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) return Math.min(seconds * 1000, maxDelayMs);
  const date = Date.parse(header);
  if (!isNaN(date)) return Math.min(Math.max(date - Date.now(), 0), maxDelayMs);
  return null;
}

function buildRetryCondition(method: string): (error: AxiosError) => boolean {
  return (error) => {
    if (!IDEMPOTENT_METHODS.has(method.toUpperCase())) return false;
    if (axios.isCancel(error)) return false;
    if (axiosRetry.isNetworkError(error)) return true;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true;
    const status = error.response?.status;
    return status === 429 || (status !== undefined && status >= 500);
  };
}

function buildProgressHandler(onProgress: (p: { loaded: number; total: number }) => void) {
  return (event: { loaded?: number; total?: number }) => {
    if (!event.total) return;
    onProgress({ loaded: event.loaded ?? 0, total: event.total });
  };
}

function flattenHeaders(response: AxiosResponse): Record<string, string> {
  return { ...response.headers } as Record<string, string>;
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

function mapToNetworkError(error: unknown): NetworkError {
  if (error instanceof NetworkError) return error;
  if (axios.isCancel(error)) return new NetworkError({ code: 'REQUEST_ABORTED', message: 'Request aborted' });
  if (axios.isAxiosError(error)) return mapAxiosError(error);
  if (error instanceof TypeError) return new NetworkError({ code: 'NETWORK_OFFLINE', message: error.message ?? 'Network error' });
  return new NetworkError({ code: 'CLIENT_ERROR', message: (error as Error).message ?? 'Unexpected error' });
}

function mapAxiosError(error: AxiosError): NetworkError {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new NetworkError({ code: 'NETWORK_TIMEOUT', message: 'Request timed out' });
  }
  if (error.code === 'ERR_NETWORK') {
    return new NetworkError({ code: 'NETWORK_OFFLINE', message: error.message ?? 'Network error' });
  }
  if (!error.response) return new NetworkError({ code: 'CLIENT_ERROR', message: error.message ?? 'Request failed' });
  return mapAxiosResponseError(error);
}

function mapAxiosResponseError(error: AxiosError): NetworkError {
  const status = error.response!.status;
  const body = error.response!.data;
  if (status === 429) {
    const header = error.response!.headers['retry-after'] as string | undefined;
    const retryMs = header ? extractRetryAfterMs(error, 60_000) : null;
    return new NetworkError({ code: 'RATE_LIMITED', message: 'Rate limited', status, responseBody: body, ...(retryMs !== null ? { retryAfterMs: retryMs } : {}) });
  }
  if (status >= 500) return new NetworkError({ code: 'SERVER_ERROR', message: `Server error: ${status}`, status, responseBody: body });
  return new NetworkError({ code: 'CLIENT_ERROR', message: `Client error: ${status}`, status, responseBody: body });
}
