import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  startStorage(apiPort: number, dbPath: string, globalConfigJSON: string): Promise<string>;
  stopStorage(): Promise<string>;
  checkStorage(): Promise<boolean>;
}

const NativeModule = TurboModuleRegistry.get<Spec>('TonStorage');

export function getNativeTonStorage(): Spec {
  if (!NativeModule) {
    throw new Error('TonStorage is not available. This package requires iOS or Android.');
  }
  return NativeModule;
}
