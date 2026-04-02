import { Logger } from '@ion/diagnostics';
import type { NetworkStateProvider } from '@ion/network';
import { runProxyHealthCheck } from './proxy-health-check';
import { restartProxy } from './proxy-lifecycle';
import type { AppLifecycleState, AppStateProvider } from '@ion/platform';
import type { ProxyManagerContext } from './types';

const TAG = 'proxy';

export function setupEventSubscriptions(
  context: ProxyManagerContext,
  options: { networkStateProvider: NetworkStateProvider; appStateProvider: AppStateProvider },
): () => void {
  const cleanups: Array<() => void> = [
    subscribeNetworkInterface(context, options.networkStateProvider),
    subscribeOnlineState(context, options.networkStateProvider),
    subscribeAppState(context, options.appStateProvider),
  ];
  return () => { for (const cleanup of cleanups) cleanup(); };
}

function subscribeNetworkInterface(context: ProxyManagerContext, provider: NetworkStateProvider): () => void {
  return provider.onNetworkInterfaceChange(() => {
    if (context.disposed || context.getStatus() !== 'connected') return;
    Logger.info('Network interface changed, restarting proxy', { tag: TAG });
    void restartProxy(context);
  });
}

function subscribeOnlineState(context: ProxyManagerContext, provider: NetworkStateProvider): () => void {
  return provider.onStateChange((isOnline) => {
    if (context.disposed) return;
    if (!isOnline) {
      Logger.info('Device went offline', { tag: TAG });
      if (context.getStatus() === 'connected') context.transition('disconnected');
    } else if (context.getStatus() === 'disconnected') {
      Logger.info('Device back online, restarting proxy', { tag: TAG });
      void restartProxy(context);
    }
  });
}

function subscribeAppState(context: ProxyManagerContext, provider: AppStateProvider): () => void {
  let wasBackgrounded = false;
  return provider.onStateChange((state: AppLifecycleState) => {
    if (context.disposed) return;
    if (state === 'background') {
      wasBackgrounded = true;
    } else if (state === 'active' && wasBackgrounded) {
      wasBackgrounded = false;
      Logger.info('App returned to foreground, checking proxy health', { tag: TAG });
      void checkAndRestart(context);
    }
  });
}

async function checkAndRestart(context: ProxyManagerContext): Promise<void> {
  if (context.isRestarting || context.disposed) return;
  const isHealthy = await runProxyHealthCheck(context.healthCheckTimeoutMs);
  if (!isHealthy && !context.disposed) {
    void restartProxy(context);
  }
}
