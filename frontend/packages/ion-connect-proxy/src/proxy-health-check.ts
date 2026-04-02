import { Logger } from '@ion/diagnostics';
import { getNativeIonConnectProxy } from './native-ion-connect-proxy';

const TAG = 'proxy';

export async function runProxyHealthCheck(timeoutMs: number): Promise<boolean> {
  const nativeModule = getNativeIonConnectProxy();
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  try {
    const isHealthy = await Promise.race([nativeModule.checkProxy(), timeout]);
    if (!isHealthy) {
      Logger.warning('Proxy health check failed', { tag: TAG });
    }
    return isHealthy;
  } catch (error) {
    Logger.error('Proxy health check error', { tag: TAG, ...(error instanceof Error && { error }) });
    return false;
  }
}
