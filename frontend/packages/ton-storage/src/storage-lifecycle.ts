import { Logger } from '@ion/diagnostics';
import { startTonStorage } from './start-ton-storage';
import { stopTonStorage } from './stop-ton-storage';
import type { StorageManagerContext } from './types';

const TAG = 'ton-storage';

export async function restartStorage(context: StorageManagerContext): Promise<void> {
  if (context.disposed) return;
  if (context.isRestarting && context.restartPromise) {
    await context.restartPromise;
    return;
  }
  context.isRestarting = true;
  context.restartPromise = executeRestart(context);
  try {
    await context.restartPromise;
  } finally {
    context.isRestarting = false;
    context.restartPromise = null;
  }
}

async function executeRestart(context: StorageManagerContext): Promise<void> {
  context.transition('reconnecting');
  Logger.info('TON Storage restarting', { tag: TAG, data: { apiPort: context.apiPort } });
  await stopStorageSilently();
  await retryStorageStart(context);
}

export async function stopStorageSilently(): Promise<void> {
  try {
    await stopTonStorage();
  } catch (error) {
    Logger.debug('TON Storage stop ignored during restart', {
      tag: TAG,
      data: { error: (error as Error).message },
    });
  }
}

async function retryStorageStart(context: StorageManagerContext): Promise<void> {
  for (let attempt = 1; attempt <= context.maxRestartAttempts; attempt++) {
    if (context.disposed) return;
    try {
      await attemptStorageStart(context);
      return;
    } catch {
      Logger.warning('TON Storage restart attempt failed', {
        tag: TAG,
        data: { attempt, maxAttempts: context.maxRestartAttempts },
      });
      if (attempt < context.maxRestartAttempts) {
        await delay(calculateBackoffDelay(attempt, context.restartBaseDelayMs));
      }
    }
  }
  context.transition('disconnected');
  Logger.error('TON Storage restart exhausted all attempts', { tag: TAG });
}

async function attemptStorageStart(context: StorageManagerContext): Promise<void> {
  await startTonStorage({
    apiPort: context.apiPort,
    dbPath: context.dbPath,
    globalConfigJSON: context.globalConfigJSON,
  });
  context.transition('connected');
  Logger.info('TON Storage restarted', { tag: TAG, data: { apiPort: context.apiPort } });
}

function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  const exponential = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * baseDelay * 0.3;
  return exponential + jitter;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
