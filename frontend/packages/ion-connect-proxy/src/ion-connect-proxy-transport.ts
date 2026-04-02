import type { Transport } from '@ion/network';
import NativeIonConnectProxy from './native-ion-connect-proxy';

export function createIonConnectProxyTransport(): Transport {
  return {
    async request(config) {
      const result = await NativeIonConnectProxy.proxyRequest(
        config.method,
        config.url,
        JSON.stringify(config.headers ?? {}),
        typeof config.body === 'string' ? config.body : JSON.stringify(config.body ?? ''),
      );
      return JSON.parse(result);
    },
    async upload(config) {
      const result = await NativeIonConnectProxy.proxyUpload(
        config.url,
        config.filePath,
        JSON.stringify(config.headers ?? {}),
      );
      return JSON.parse(result);
    },
    async download(config) {
      const result = await NativeIonConnectProxy.proxyDownload(
        config.url,
        config.destinationPath,
        JSON.stringify(config.headers ?? {}),
      );
      return JSON.parse(result);
    },
  };
}
