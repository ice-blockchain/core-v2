import type { Interceptor } from './interceptor-types';
import type { RetryConfig } from './retry-types';
import type { UploadProgress } from './shared-types';
import type { RequestQueue } from './queue-types';
import type { Transport } from './transport-types';

export interface HttpClientConfig {
  baseUrl: string;
  transport?: Transport;
  timeoutMs?: number;
  maxResponseSizeBytes?: number;
  maxRequestBodySizeBytes?: number;
  interceptors?: Interceptor[];
  retryConfig?: RetryConfig;
  httpsAllowlist?: string[];
  isProduction?: boolean | undefined;
  requestQueue?: RequestQueue | undefined;
}

export interface RequestOptions {
  params?: Record<string, string> | undefined;
  query?: Record<string, string> | undefined;
  headers?: Record<string, string> | undefined;
  timeoutMs?: number | undefined;
  signal?: AbortSignal | undefined;
  offlineQueue?: boolean | undefined;
  retryable?: boolean | undefined;
}

export interface RequestOptionsWithBody extends RequestOptions {
  body?: unknown;
}

export interface UploadOptions extends RequestOptions {
  onProgress?: (progress: UploadProgress) => void;
}

export interface HttpResponse<T> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

export interface HttpClient {
  get<T>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
  post<T>(url: string, options?: RequestOptionsWithBody): Promise<HttpResponse<T>>;
  put<T>(url: string, options?: RequestOptionsWithBody): Promise<HttpResponse<T>>;
  patch<T>(url: string, options?: RequestOptionsWithBody): Promise<HttpResponse<T>>;
  delete<T>(url: string, options?: RequestOptions): Promise<HttpResponse<T>>;
  upload<T>(
    url: string,
    formData: FormData,
    options?: UploadOptions,
  ): Promise<HttpResponse<T>>;
}
