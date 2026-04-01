import { createHttpClient } from '@ion/network';
import type { HttpClient } from '@ion/network';
import { createIonConnectProxyTransport } from './ion-connect-proxy-transport';

export function createIonConnectProxyClient(options: { port: number; baseUrl: string }): HttpClient {
  const transport = createIonConnectProxyTransport({ port: options.port });
  return createHttpClient({ baseUrl: options.baseUrl, transport });
}
