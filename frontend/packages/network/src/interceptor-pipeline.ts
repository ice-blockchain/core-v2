import { Logger } from '@ion/diagnostics';
import type { Interceptor, InterceptedRequest, InterceptedResponse } from './interceptor-types';
import type { NetworkError } from './network-error';

interface InterceptorPipelineOptions {
  request: InterceptedRequest;
  interceptors: Interceptor[];
}

export async function runRequestInterceptors(
  options: InterceptorPipelineOptions,
): Promise<InterceptedRequest> {
  let current = options.request;
  for (const interceptor of options.interceptors) {
    if (!interceptor.onRequest) continue;
    const previous = current.body;
    current = await interceptor.onRequest(current);
    if (previous !== current.body) {
      Logger.debug(`Interceptor "${interceptor.name}" mutated request body`, {
        tag: 'network',
        data: { interceptor: interceptor.name, url: current.url },
      });
    }
  }
  return current;
}

export async function runResponseInterceptors(
  interceptors: Interceptor[],
  response: InterceptedResponse,
): Promise<InterceptedResponse> {
  let current = response;
  const reversed = [...interceptors].reverse();
  for (const interceptor of reversed) {
    if (!interceptor.onResponse) continue;
    current = await interceptor.onResponse(current);
  }
  return current;
}

export async function runErrorInterceptors(
  interceptors: Interceptor[],
  error: NetworkError,
): Promise<NetworkError> {
  let current = error;
  for (const interceptor of interceptors) {
    if (!interceptor.onError) continue;
    current = await interceptor.onError(current);
  }
  return current;
}
