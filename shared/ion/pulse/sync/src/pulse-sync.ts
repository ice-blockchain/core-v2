import * as Y from 'yjs';
import type { PulseSync, PulseSyncConfig, PulseSyncState } from './types.js';

function isEmptyUpdate(update: Uint8Array): boolean {
  return update.length <= 2;
}

export function createPulseSync(document: Y.Doc, config?: PulseSyncConfig): PulseSync {
  const observers: Set<(update: Uint8Array) => void> = new Set();
  let pendingUpdates = 0;

  const handleUpdate = (update: Uint8Array) => {
    pendingUpdates++;
    for (const callback of observers) {
      callback(update);
    }
  };

  document.on('update', handleUpdate);

  if (config?.onUpdate) {
    observers.add(config.onUpdate);
  }

  return {
    applyPulseUpdate(update: Uint8Array): void {
      Y.applyUpdate(document, update);
    },

    encodePulseState(): Uint8Array {
      return Y.encodeStateAsUpdate(document);
    },

    encodePulseStateVector(): Uint8Array {
      return Y.encodeStateVector(document);
    },

    computePulseSync(remoteStateVector: Uint8Array): Uint8Array | null {
      const diff = Y.encodeStateAsUpdate(document, remoteStateVector);
      if (isEmptyUpdate(diff)) {
        return null;
      }
      return diff;
    },

    getSyncState(): PulseSyncState {
      return {
        stateVector: Y.encodeStateVector(document),
        pendingUpdates,
      };
    },

    onUpdate(callback: (update: Uint8Array) => void): () => void {
      observers.add(callback);
      return () => {
        observers.delete(callback);
      };
    },

    destroy(): void {
      document.off('update', handleUpdate);
      observers.clear();
      pendingUpdates = 0;
    },
  };
}
