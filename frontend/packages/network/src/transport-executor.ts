import type { Transport } from './transport-types';
import type { HttpResponse } from './http-types';
import type { InterceptedRequest, InterceptedResponse, Interceptor } from './interceptor-types';
import { runResponseInterceptors } from './interceptor-pipeline';
import { Logger } from '@ion/diagnostics';
import { NetworkError } from './network-error';

interface TransportRequestInput {
  transport: Transport;
  request: InterceptedRequest;
  timeoutMs: number;
  interceptors?: Interceptor[] | undefined;
  signal?: AbortSignal | undefined;
  query?: Record<string, string> | undefined;
  onProgress?: ((progress: { loaded: number; total: number }) => void) | undefined;
}

export async function executeTransportRequest<T>(input: TransportRequestInput): Promise<HttpResponse<T>> {
  const { transport, request, timeoutMs, interceptors, signal, query, onProgress } = input;
  logOutgoingRequest(request);
  const startMs = Date.now();
  try {
    const response = await transport.request<T>({
      method: request.method, url: request.url, headers: request.headers, body: request.body,
      timeoutMs, signal, query, onProgress,
    });
    const intercepted: InterceptedResponse = { status: response.status, headers: response.headers, body: response.body, url: request.url };
    const final = interceptors?.length ? await runResponseInterceptors(interceptors, intercepted) : intercepted;
    logIncomingResponse(request, final, startMs);
    return { status: final.status, headers: final.headers, body: final.body as T };
  } catch (error) {
    logRequestFailure(request, error, startMs);
    throw error;
  }
}

const SENSITIVE_HEADERS = new Set(['authorization', 'x-api-key', 'cookie']);
const MAX_BODY_LOG_CHARS = 2000;

function logOutgoingRequest(request: InterceptedRequest): void {
  Logger.info('>> HTTP request', {
    tag: 'network',
    data: {
      method: request.method,
      url: request.url,
      headers: maskSensitiveHeaders(request.headers),
      body: truncateBody(request.body),
    },
  });
}

function logIncomingResponse(request: InterceptedRequest, response: InterceptedResponse, startMs: number): void {
  Logger.info('<< HTTP response', {
    tag: 'network',
    data: {
      method: request.method,
      url: request.url,
      status: response.status,
      durationMs: Date.now() - startMs,
      body: truncateBody(response.body),
    },
  });
}

function logRequestFailure(request: InterceptedRequest, error: unknown, startMs: number): void {
  const base = { method: request.method, url: request.url, durationMs: Date.now() - startMs };
  if (error instanceof NetworkError) {
    Logger.warning('!! HTTP error', {
      tag: 'network',
      data: { ...base, status: error.status, code: error.code, responseBody: truncateBody(error.responseBody), rawBody: error.rawBody },
    });
    return;
  }
  Logger.warning('!! HTTP error', { tag: 'network', data: { ...base, error: (error as Error).message } });
}

function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    masked[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? `${value.slice(0, 12)}[REDACTED]` : value;
  }
  return masked;
}

function truncateBody(body: unknown): unknown {
  if (body === undefined || body === null) return body;
  if (body instanceof FormData) return '[FormData]';
  const serialized = typeof body === 'string' ? body : JSON.stringify(body);
  if (serialized.length <= MAX_BODY_LOG_CHARS) return body;
  return `${serialized.slice(0, MAX_BODY_LOG_CHARS)}...[truncated ${serialized.length} chars]`;
}
