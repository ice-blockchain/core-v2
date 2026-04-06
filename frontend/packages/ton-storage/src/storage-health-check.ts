import { Logger } from '@ion/diagnostics';
import { getNativeTonStorage } from './native-ton-storage';

const TAG = 'ton-storage';
const DEFAULT_HEALTH_TIMEOUT_MS = 3_000;

export async function runStorageHealthCheck(timeoutMs: number = DEFAULT_HEALTH_TIMEOUT_MS): Promise<boolean> {
  const nativeModule = getNativeTonStorage();
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
  try {
    const isHealthy = await Promise.race([nativeModule.checkStorage(), timeout]);
    if (!isHealthy) {
      Logger.warning('TON Storage health check failed', { tag: TAG });
    }
    return isHealthy;
  } catch (error) {
    Logger.error('TON Storage health check error', { tag: TAG, ...(error instanceof Error && { error }) });
    return false;
  }
}
