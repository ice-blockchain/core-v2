import type { PulseStorageAdapter } from './types';

export function createSqliteAdapter(): PulseStorageAdapter {
  throw new Error('SQLite adapter is only available in React Native environments');
}
