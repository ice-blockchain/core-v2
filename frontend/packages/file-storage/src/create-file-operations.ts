import { getNativeFileOperations } from './native-file-operations';
import type { FileOperations } from './types';

export function createFileOperations(): FileOperations {
  const native = getNativeFileOperations();

  return {
    exists: (path) => native.exists(path),
    deleteFile: (path) => native.deleteFile(path),
    getFileSize: (path) => native.getFileSize(path),
    moveFile: (options) => native.moveFile(options.sourcePath, options.destinationPath),
    downloadToFile: async (options) => {
      const headersJSON = options.headers ? JSON.stringify(options.headers) : '{}';
      await native.downloadToFile(options.url, options.destinationPath, headersJSON);
    },
  };
}
