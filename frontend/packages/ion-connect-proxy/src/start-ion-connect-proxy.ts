import { Logger } from '@ion/diagnostics';
import { getNativeIonConnectProxy } from './native-ion-connect-proxy';
import type { StartIonConnectProxyOptions } from './types';

const DEFAULT_PROXY_PORT = 8888;
const TAG = 'proxy';

export async function startIonConnectProxy(options?: StartIonConnectProxyOptions): Promise<string> {
  const nativeModule = getNativeIonConnectProxy();
  const port = options?.port ?? DEFAULT_PROXY_PORT;
  try {
    const result = options?.config
      ? await nativeModule.startProxyWithConfig(port, JSON.stringify(options.config))
      : await nativeModule.startProxy(port);
    if (result.startsWith('ERR:')) throw new Error(result);
    Logger.info('Proxy started', { tag: TAG, data: { port } });
    return result;
  } catch (error) {
    Logger.error('Proxy failed to start', { tag: TAG, data: { port }, ...(error instanceof Error && { error }) });
    throw error;
  }
}
