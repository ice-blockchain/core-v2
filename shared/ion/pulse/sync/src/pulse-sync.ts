import * as Y from 'yjs';
import { encodeStateAsUpdate, encodeStateVector, applyUpdate } from 'yjs';
import type { PulseSyncConfig } from './types';

export interface PulseSyncInstance {
  readonly documentId: string;
  readonly document: Y.Doc;
  readonly encodeState: () => Uint8Array;
  readonly applyUpdate: (update: Uint8Array) => void;
  readonly createSyncStep1: () => Uint8Array;
  readonly createSyncStep2: (remoteStateVector: Uint8Array) => Uint8Array;
}

export function createPulseSync(config: PulseSyncConfig): PulseSyncInstance {
  const document = new Y.Doc();

  return {
    documentId: config.documentId,
    document,
    encodeState: () => encodePulseState(document),
    applyUpdate: (update) => applyPulseUpdate(document, update),
    createSyncStep1: () => createSyncStep1(document),
    createSyncStep2: (remoteStateVector) => createSyncStep2(document, remoteStateVector),
  };
}

export function encodePulseState(document: Y.Doc): Uint8Array {
  return encodeStateAsUpdate(document);
}

export function applyPulseUpdate(document: Y.Doc, update: Uint8Array): void {
  applyUpdate(document, update);
}

export function createSyncStep1(document: Y.Doc): Uint8Array {
  return encodeStateVector(document);
}

export function createSyncStep2(document: Y.Doc, remoteStateVector: Uint8Array): Uint8Array {
  return encodeStateAsUpdate(document, remoteStateVector);
}
