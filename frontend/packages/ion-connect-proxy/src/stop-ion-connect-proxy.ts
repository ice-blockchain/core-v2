import { Logger } from '@ion/diagnostics';
import { getNativeIonConnectProxy } from './native-ion-connect-proxy';

const TAG = 'proxy';

export async function stopIonConnectProxy(): Promise<string> {
  try {
    const result = await getNativeIonConnectProxy().stopProxy();
    Logger.info('Proxy stopped', { tag: TAG });
    return result;
  } catch (error) {
    Logger.error('Proxy failed to stop', { tag: TAG, ...(error instanceof Error && { error }) });
    throw error;
  }
}
