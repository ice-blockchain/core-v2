import { Logger } from '@ion/diagnostics';
import type { NetworkStateProvider } from '@ion/network';
import type { AppStateProvider } from '@ion/platform';
import { runStorageHealthCheck } from './storage-health-check';
import { restartStorage } from './storage-lifecycle';
import type { StorageManagerContext } from './types';

const TAG = 'ton-storage';

export function setupStorageEventSubscriptions(
  context: StorageManagerContext,
  options: { networkStateProvider: NetworkStateProvider; appStateProvider: AppStateProvider },
): () => void {
  const cleanups: Array<() => void> = [
    subscribeNetworkInterface(context, options.networkStateProvider),
    subscribeOnlineState(context, options.networkStateProvider),
    subscribeAppState(context, options.appStateProvider),
  ];
  return () => { for (const cleanup of cleanups) cleanup(); };
}

function subscribeNetworkInterface(context: StorageManagerContext, provider: NetworkStateProvider): () => void {
  return provider.onNetworkInterfaceChange(() => {
    if (context.disposed || context.getStatus() !== 'connected') return;
    Logger.info('Network interface changed, restarting TON Storage', { tag: TAG });
    void restartStorage(context);
  });
}

function subscribeOnlineState(context: StorageManagerContext, provider: NetworkStateProvider): () => void {
  return provider.onStateChange((isOnline) => {
    if (context.disposed) return;
    if (!isOnline) {
      Logger.info('Device went offline', { tag: TAG });
      if (context.getStatus() === 'connected') context.transition('disconnected');
    } else if (context.getStatus() === 'disconnected') {
      Logger.info('Device back online, restarting TON Storage', { tag: TAG });
      void restartStorage(context);
    }
  });
}

function subscribeAppState(context: StorageManagerContext, provider: AppStateProvider): () => void {
  let wasBackgrounded = false;
  return provider.onStateChange((state) => {
    if (context.disposed) return;
    if (state === 'background') {
      wasBackgrounded = true;
    } else if (state === 'active' && wasBackgrounded) {
      wasBackgrounded = false;
      Logger.info('App returned to foreground, checking TON Storage health', { tag: TAG });
      void checkAndRestart(context);
    }
  });
}

async function checkAndRestart(context: StorageManagerContext): Promise<void> {
  if (context.isRestarting || context.disposed) return;
  const isHealthy = await runStorageHealthCheck();
  if (!isHealthy && !context.disposed) {
    void restartStorage(context);
  }
}
