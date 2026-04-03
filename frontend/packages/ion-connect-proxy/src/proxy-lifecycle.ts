import { Logger } from '@ion/diagnostics';
import { startIonConnectProxy } from './start-ion-connect-proxy';
import { stopIonConnectProxy } from './stop-ion-connect-proxy';
import type { ProxyManagerContext } from './types';

const TAG = 'proxy';

export async function restartProxy(context: ProxyManagerContext): Promise<void> {
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

async function executeRestart(context: ProxyManagerContext): Promise<void> {
  context.transition('reconnecting');
  Logger.info('Proxy restarting', { tag: TAG, data: { port: context.port } });
  await stopProxySilently();
  await retryProxyStart(context);
}

export async function stopProxySilently(): Promise<void> {
  try {
    await stopIonConnectProxy();
  } catch (error) {
    Logger.debug('Proxy stop ignored during restart', { tag: TAG, data: { error: (error as Error).message } });
  }
}

async function retryProxyStart(context: ProxyManagerContext): Promise<void> {
  for (let attempt = 1; attempt <= context.maxRestartAttempts; attempt++) {
    if (context.disposed) return;
    try {
      await attemptProxyStart(context);
      return;
    } catch (error) {
      Logger.warning('Proxy restart attempt failed', {
        tag: TAG,
        data: { attempt, maxAttempts: context.maxRestartAttempts },
      });
      if (attempt < context.maxRestartAttempts) {
        await delay(calculateBackoffDelay(attempt, context.restartBaseDelayMs));
      }
    }
  }
  context.transition('disconnected');
  Logger.error('Proxy restart exhausted all attempts', { tag: TAG });
}

async function attemptProxyStart(context: ProxyManagerContext): Promise<void> {
  await startIonConnectProxy({ port: context.port, configJSON: context.configJSON });
  context.transition('connected');
  Logger.info('Proxy restarted', { tag: TAG, data: { port: context.port } });
}

function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  const exponential = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * baseDelay * 0.3;
  return exponential + jitter;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
