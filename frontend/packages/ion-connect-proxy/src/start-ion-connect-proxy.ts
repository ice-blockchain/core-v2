import NativeIonConnectProxy from './native-ion-connect-proxy';
import type { StartIonConnectProxyOptions } from './types';

const DEFAULT_PROXY_PORT = 8888;

export async function startIonConnectProxy(options?: StartIonConnectProxyOptions): Promise<string> {
  const port = options?.port ?? DEFAULT_PROXY_PORT;
  const result = options?.config
    ? await NativeIonConnectProxy.startProxyWithConfig(port, JSON.stringify(options.config))
    : await NativeIonConnectProxy.startProxy(port);
  if (result.startsWith('ERR:')) throw new Error(result);
  return result;
}
