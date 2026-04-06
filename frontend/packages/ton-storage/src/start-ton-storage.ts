import { Logger } from '@ion/diagnostics';
import { getNativeTonStorage } from './native-ton-storage';
import type { StartTonStorageOptions } from './types';

const TAG = 'ton-storage';

export async function startTonStorage(options: StartTonStorageOptions): Promise<string> {
  const nativeModule = getNativeTonStorage();
  const { apiPort, dbPath } = options;
  try {
    const result = await nativeModule.startStorage(apiPort, dbPath, options.globalConfigJSON ?? '');
    if (typeof result !== 'string') throw new Error(`Unexpected native result type: ${typeof result}`);
    if (result.startsWith('ERR:')) throw new Error(result);
    Logger.info('TON Storage started', { tag: TAG, data: { apiPort } });
    return result;
  } catch (error) {
    Logger.error('TON Storage failed to start', {
      tag: TAG,
      data: { apiPort },
      ...(error instanceof Error && { error }),
    });
    throw error;
  }
}
