import { createHttpClient } from '@ion/network';
import type { HttpClient } from '@ion/network';
import { createIonConnectProxyTransport } from './ion-connect-proxy-transport';

export function createIonConnectProxyClient(options: { baseUrl: string }): HttpClient {
  const transport = createIonConnectProxyTransport();
  return createHttpClient({ baseUrl: options.baseUrl, transport });
}
