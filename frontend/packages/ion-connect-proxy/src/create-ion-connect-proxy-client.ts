import { createHttpClient } from '@ion/network';
import type { HttpClient } from '@ion/network';
import { Logger } from '@ion/diagnostics';
import { createIonConnectProxyTransport } from './ion-connect-proxy-transport';

const TAG = 'proxy';

export function createIonConnectProxyClient(options: { baseUrl: string }): HttpClient {
  const transport = createIonConnectProxyTransport();
  Logger.debug('Proxy client created', { tag: TAG, data: { baseUrl: options.baseUrl } });
  return createHttpClient({ baseUrl: options.baseUrl, transport });
}
