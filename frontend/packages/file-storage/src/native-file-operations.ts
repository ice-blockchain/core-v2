import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  exists(path: string): Promise<boolean>;
  deleteFile(path: string): Promise<void>;
  getFileSize(path: string): Promise<number>;
  moveFile(sourcePath: string, destinationPath: string): Promise<void>;
  downloadToFile(url: string, destinationPath: string, headersJSON: string): Promise<void>;
}

const NativeModule = TurboModuleRegistry.get<Spec>('FileStorageOps');

export function getNativeFileOperations(): Spec {
  if (!NativeModule) {
    throw new Error('FileStorageOps is not available. This package requires iOS or Android.');
  }
  return NativeModule;
}
