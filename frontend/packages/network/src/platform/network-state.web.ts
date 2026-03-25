import type { NetworkStateProvider } from '../event-types';

interface NavigatorConnection extends EventTarget {
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NavigatorConnection | undefined;
}

export function createNetworkStateProvider(): NetworkStateProvider {
  const state = createInitialState();
  attachGlobalListeners(state);
  return buildProviderInterface(state);
}

interface ProviderState {
  online: boolean;
  stateHandlers: Set<(isOnline: boolean) => void>;
  interfaceHandlers: Set<() => void>;
  connection: NavigatorConnection | undefined;
  cleanups: Array<() => void>;
}

function createInitialState(): ProviderState {
  return {
    online: navigator.onLine,
    stateHandlers: new Set(),
    interfaceHandlers: new Set(),
    connection: (navigator as NavigatorWithConnection).connection,
    cleanups: [],
  };
}

function attachGlobalListeners(state: ProviderState): void {
  const onOnline = (): void => { updateOnlineState(state, true); };
  const onOffline = (): void => { updateOnlineState(state, false); };
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') updateOnlineState(state, navigator.onLine);
  };
  const onConnection = (): void => {
    for (const handler of state.interfaceHandlers) handler();
  };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisibility);
  state.connection?.addEventListener('change', onConnection);
  state.cleanups.push(
    () => window.removeEventListener('online', onOnline),
    () => window.removeEventListener('offline', onOffline),
    () => document.removeEventListener('visibilitychange', onVisibility),
    () => state.connection?.removeEventListener('change', onConnection),
  );
}

function updateOnlineState(state: ProviderState, isNowOnline: boolean): void {
  if (state.online === isNowOnline) return;
  state.online = isNowOnline;
  for (const handler of state.stateHandlers) handler(state.online);
}

function buildProviderInterface(state: ProviderState): NetworkStateProvider {
  return {
    isOnline: () => state.online,
    onStateChange(handler) {
      state.stateHandlers.add(handler);
      return () => { state.stateHandlers.delete(handler); };
    },
    onNetworkInterfaceChange(handler) {
      state.interfaceHandlers.add(handler);
      return () => { state.interfaceHandlers.delete(handler); };
    },
    dispose() {
      for (const cleanup of state.cleanups) cleanup();
      state.stateHandlers.clear();
      state.interfaceHandlers.clear();
    },
  };
}
