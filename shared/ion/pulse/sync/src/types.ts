export interface PulseSyncState {
  stateVector: Uint8Array;
  pendingUpdates: number;
}

export interface PulseSyncConfig {
  onUpdate?: (update: Uint8Array) => void;
}

export interface PulseSync {
  applyPulseUpdate(update: Uint8Array): void;
  encodePulseState(): Uint8Array;
  encodePulseStateVector(): Uint8Array;
  computePulseSync(remoteStateVector: Uint8Array): Uint8Array | null;
  getSyncState(): PulseSyncState;
  onUpdate(callback: (update: Uint8Array) => void): () => void;
  destroy(): void;
}
