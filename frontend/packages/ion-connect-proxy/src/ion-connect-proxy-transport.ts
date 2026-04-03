import type { Transport, TransportRequest, TransportResponse, TransportUploadRequest, TransportDownloadRequest } from '@ion/network';
import { Logger } from '@ion/diagnostics';
import type { Spec } from './native-ion-connect-proxy';
import { getNativeIonConnectProxy } from './native-ion-connect-proxy';

const TAG = 'proxy';

export function createIonConnectProxyTransport(): Transport {
  const nativeModule = getNativeIonConnectProxy();
  return {
    request: (config) => executeProxyRequest(nativeModule, config),
    upload: (config) => executeProxyUpload(nativeModule, config),
    download: (config) => executeProxyDownload(nativeModule, config),
  };
}

async function executeProxyRequest<T>(nativeModule: Spec, config: TransportRequest): Promise<TransportResponse<T>> {
  Logger.addBreadcrumb({ message: 'Proxy request', category: 'proxy.http', data: { url: config.url, method: config.method } });
  try {
    const result = await nativeModule.proxyRequest(
      config.method,
      config.url,
      JSON.stringify(config.headers ?? {}),
      typeof config.body === 'string' ? config.body : JSON.stringify(config.body ?? ''),
    );
    return JSON.parse(result);
  } catch (error) {
    Logger.error('Proxy request failed', { tag: TAG, data: { url: config.url, method: config.method }, ...(error instanceof Error && { error }) });
    throw error;
  }
}

async function executeProxyUpload<T>(nativeModule: Spec, config: TransportUploadRequest): Promise<TransportResponse<T>> {
  Logger.addBreadcrumb({ message: 'Proxy upload', category: 'proxy.http', data: { url: config.url } });
  try {
    const result = await nativeModule.proxyUpload(
      config.url,
      config.filePath,
      JSON.stringify(config.headers ?? {}),
    );
    return JSON.parse(result);
  } catch (error) {
    Logger.error('Proxy upload failed', { tag: TAG, data: { url: config.url }, ...(error instanceof Error && { error }) });
    throw error;
  }
}

async function executeProxyDownload(nativeModule: Spec, config: TransportDownloadRequest): Promise<TransportResponse<void>> {
  Logger.addBreadcrumb({ message: 'Proxy download', category: 'proxy.http', data: { url: config.url } });
  try {
    const result = await nativeModule.proxyDownload(
      config.url,
      config.destinationPath,
      JSON.stringify(config.headers ?? {}),
    );
    return JSON.parse(result);
  } catch (error) {
    Logger.error('Proxy download failed', { tag: TAG, data: { url: config.url }, ...(error instanceof Error && { error }) });
    throw error;
  }
}
