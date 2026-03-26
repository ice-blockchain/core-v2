export interface PulseSyncState {
  readonly stateVector: Uint8Array;
  readonly documentId: string;
}

export interface PulseSyncMessage {
  readonly type: 'sync-step1' | 'sync-step2' | 'sync-update';
  readonly payload: Uint8Array;
  readonly documentId: string;
}

export interface PulseSyncConfig {
  readonly documentId: string;
}
