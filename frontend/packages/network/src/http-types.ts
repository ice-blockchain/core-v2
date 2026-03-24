import type { Interceptor } from './interceptor-types';
import type { RetryConfig } from './retry-types';
import type { UploadProgress } from './shared-types';

export interface HttpClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  maxRedirects?: number;
  maxResponseSizeBytes?: number;
  maxRequestBodySizeBytes?: number;
  interceptors?: Interceptor[];
  retryConfig?: RetryConfig;
  httpsAllowlist?: string[];
}

export interface RequestOptions {
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  offlineQueue?: boolean;
  retryable?: boolean;
}

export interface RequestOptionsWithBody extends RequestOptions {
  body?: unknown;
}

export interface UploadOptions extends RequestOptions {
  onProgress?: (progress: UploadProgress) => void;
}

export interface HttpClient {
  get<T>(url: string, options?: RequestOptions): Promise<T>;
  post<T>(url: string, options?: RequestOptionsWithBody): Promise<T>;
  put<T>(url: string, options?: RequestOptionsWithBody): Promise<T>;
  patch<T>(url: string, options?: RequestOptionsWithBody): Promise<T>;
  delete<T>(url: string, options?: RequestOptions): Promise<T>;
  upload<T>(
    url: string,
    formData: FormData,
    options?: UploadOptions,
  ): Promise<T>;
}
