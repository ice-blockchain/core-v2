import type { Transport } from '@ion/network';
import { getNativeIonConnectProxy } from './native-ion-connect-proxy';

export function createIonConnectProxyTransport(): Transport {
  const nativeModule = getNativeIonConnectProxy();
  return {
    async request(config) {
      const result = await nativeModule.proxyRequest(
        config.method,
        config.url,
        JSON.stringify(config.headers ?? {}),
        typeof config.body === 'string' ? config.body : JSON.stringify(config.body ?? ''),
      );
      return JSON.parse(result);
    },
    async upload(config) {
      const result = await nativeModule.proxyUpload(
        config.url,
        config.filePath,
        JSON.stringify(config.headers ?? {}),
      );
      return JSON.parse(result);
    },
    async download(config) {
      const result = await nativeModule.proxyDownload(
        config.url,
        config.destinationPath,
        JSON.stringify(config.headers ?? {}),
      );
      return JSON.parse(result);
    },
  };
}
