import { validateFileId } from './validate-file-id';

export function buildCachePath(cacheDirectoryPath: string, fileId: string): string {
  validateFileId(fileId);
  return `${cacheDirectoryPath}/${fileId}`;
}
