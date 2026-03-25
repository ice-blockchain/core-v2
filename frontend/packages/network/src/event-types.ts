export type NetworkEvent =
  | { type: 'auth-token-refreshed' }
  | { type: 'auth-expired' }
  | { type: 'online-state-changed'; isOnline: boolean };

export interface NetworkEventListener {
  on<T extends NetworkEvent['type']>(
    type: T,
    handler: (event: Extract<NetworkEvent, { type: T }>) => void,
  ): () => void;
  listenerCount(type: NetworkEvent['type']): number;
  maxListenersPerEvent: number;
}

export interface NetworkEventEmitter extends NetworkEventListener {
  emit(event: NetworkEvent): void;
}

export interface NetworkStateProvider {
  isOnline(): boolean;
  onStateChange(handler: (isOnline: boolean) => void): () => void;
  onNetworkInterfaceChange(handler: () => void): () => void;
  dispose(): void;
}
