import type { Transport } from './transport-types';
import type { HttpResponse } from './http-types';
import type { InterceptedRequest, InterceptedResponse, Interceptor } from './interceptor-types';
import { runResponseInterceptors } from './interceptor-pipeline';
import { Logger } from '@ion/diagnostics';

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
  Logger.addBreadcrumb({ message: 'HTTP request started', category: 'network.http', data: { url: request.url, method: request.method } });
  const response = await transport.request<T>({
    method: request.method, url: request.url, headers: request.headers, body: request.body,
    timeoutMs, signal, query, onProgress,
  });
  const intercepted: InterceptedResponse = { status: response.status, headers: response.headers, body: response.body, url: request.url };
  const final = interceptors?.length ? await runResponseInterceptors(interceptors, intercepted) : intercepted;
  return { status: final.status, headers: final.headers, body: final.body as T };
}
