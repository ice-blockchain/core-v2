import NativeIonConnectProxy from './native-ion-connect-proxy';
import type { StartIonConnectProxyOptions } from './types';

export async function startIonConnectProxy(options: StartIonConnectProxyOptions): Promise<string> {
  const result = options.config
    ? await NativeIonConnectProxy.startProxyWithConfig(options.port, JSON.stringify(options.config))
    : await NativeIonConnectProxy.startProxy(options.port);
  if (result.startsWith('ERR:')) throw new Error(result);
  return result;
}
