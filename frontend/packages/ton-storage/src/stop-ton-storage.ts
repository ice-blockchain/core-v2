import { Logger } from '@ion/diagnostics';
import { getNativeTonStorage } from './native-ton-storage';

const TAG = 'ton-storage';

export async function stopTonStorage(): Promise<string> {
  try {
    const result = await getNativeTonStorage().stopStorage();
    Logger.info('TON Storage stopped', { tag: TAG });
    return result;
  } catch (error) {
    Logger.error('TON Storage failed to stop', { tag: TAG, ...(error instanceof Error && { error }) });
    throw error;
  }
}
