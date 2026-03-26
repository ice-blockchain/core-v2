import type { PulseStorageAdapter } from './types';

export function createIndexedDbAdapter(): PulseStorageAdapter {
  throw new Error('IndexedDB adapter is only available in browser environments');
}
