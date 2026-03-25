import type { NetworkStateProvider } from '../event-types';

interface NetInfoState {
  isConnected: boolean | null;
  type: string;
}

interface NetInfoModule {
  addEventListener(listener: (state: NetInfoState) => void): () => void;
  fetch(): Promise<NetInfoState>;
}

function loadNetInfo(): NetInfoModule {
  // Dynamic require for optional peer dependency
  return require('@react-native-community/netinfo') as NetInfoModule; // eslint-disable-line @typescript-eslint/no-var-requires
}

export function createNetworkStateProvider(): NetworkStateProvider {
  const state = createState();
  const unsubscribe = attachNetInfoListener(state);
  return buildProviderInterface(state, unsubscribe);
}

interface ProviderState {
  online: boolean;
  lastConnectionType: string;
  stateHandlers: Set<(isOnline: boolean) => void>;
  interfaceHandlers: Set<() => void>;
}

function createState(): ProviderState {
  return { online: true, lastConnectionType: '', stateHandlers: new Set(), interfaceHandlers: new Set() };
}

function attachNetInfoListener(state: ProviderState): () => void {
  const netInfo = loadNetInfo();
  return netInfo.addEventListener((netState) => {
    const isNowOnline = netState.isConnected ?? false;
    if (state.online !== isNowOnline) {
      state.online = isNowOnline;
      for (const handler of state.stateHandlers) handler(state.online);
    }
    if (state.lastConnectionType && netState.type !== state.lastConnectionType) {
      for (const handler of state.interfaceHandlers) handler();
    }
    state.lastConnectionType = netState.type;
  });
}

function buildProviderInterface(
  state: ProviderState,
  unsubscribe: () => void,
): NetworkStateProvider {
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
      unsubscribe();
      state.stateHandlers.clear();
      state.interfaceHandlers.clear();
    },
  };
}
