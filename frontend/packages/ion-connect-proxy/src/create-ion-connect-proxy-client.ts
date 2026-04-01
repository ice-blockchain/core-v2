import { createHttpClient } from '@ion/network';
import type { HttpClient } from '@ion/network';
import { createIonConnectProxyTransport } from './ion-connect-proxy-transport';

const DEFAULT_PROXY_PORT = 8888;

export function createIonConnectProxyClient(options: { port?: number; baseUrl: string }): HttpClient {
  const transport = createIonConnectProxyTransport({ port: options.port ?? DEFAULT_PROXY_PORT });
  return createHttpClient({ baseUrl: options.baseUrl, transport });
}
