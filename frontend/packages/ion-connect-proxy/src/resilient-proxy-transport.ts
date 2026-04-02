import type { Transport, TransportRequest, TransportUploadRequest, TransportDownloadRequest } from '@ion/network';
import { Logger } from '@ion/diagnostics';
import type { ProxyStatus } from './types';

const TAG = 'proxy';
const READY_TIMEOUT_MS = 15_000;

export interface ResilientTransportOptions {
  innerTransport: Transport;
  onFailure: () => void;
  onStatusChange: (handler: (status: ProxyStatus) => void) => () => void;
}

export function createResilientProxyTransport(options: ResilientTransportOptions): Transport {
  return {
    request: <T>(config: TransportRequest) =>
      withRetryOnFailure(() => options.innerTransport.request<T>(config), options),
    upload: <T>(config: TransportUploadRequest) =>
      withRetryOnFailure(() => options.innerTransport.upload<T>(config), options),
    download: (config: TransportDownloadRequest) =>
      withRetryOnFailure(() => options.innerTransport.download(config), options),
  };
}

async function withRetryOnFailure<T>(
  execute: () => Promise<T>,
  options: ResilientTransportOptions,
): Promise<T> {
  try {
    return await execute();
  } catch (error) {
    if (!isProxyError(error)) throw error;
    Logger.warning('Proxy request failed, triggering reconnect', { tag: TAG });
    options.onFailure();
    await waitForProxyReady(options.onStatusChange);
    return execute();
  }
}

function isProxyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('PROXY_ERROR') || error.message.includes('IonConnectProxy');
}

function waitForProxyReady(
  onStatusChange: (handler: (status: ProxyStatus) => void) => () => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { unsubscribe(); reject(new Error('Proxy reconnect timeout')); }, READY_TIMEOUT_MS);
    const unsubscribe = onStatusChange((status) => {
      if (status === 'connected') {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      } else if (status === 'disconnected') {
        clearTimeout(timer);
        unsubscribe();
        reject(new Error('Proxy reconnect failed'));
      }
    });
  });
}
