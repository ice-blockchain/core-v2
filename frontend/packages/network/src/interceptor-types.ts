import type { NetworkError } from './network-error';

export interface Interceptor {
  name: string;
  onRequest?: (config: InterceptedRequest) => Promise<InterceptedRequest>;
  onResponse?: (response: InterceptedResponse) => Promise<InterceptedResponse>;
  onError?: (error: NetworkError) => Promise<NetworkError>;
}

export interface InterceptedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface InterceptedResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  url: string;
}
