import { Logger } from '@ion/diagnostics';
import type { createCacheRepository } from './cache-repository';
import type { FileOperations } from './types';

const TAG = 'file-storage';

interface CacheManagerDependencies {
  cacheRepository: ReturnType<typeof createCacheRepository>;
  fileOperations: FileOperations;
  maxCacheSizeBytes: number | undefined;
}

export function createCacheManager(deps: CacheManagerDependencies) {
  return {
    getCachedPath: (fileId: string) => getCachedPath(deps, fileId),
    registerFile: (fileId: string, localPath: string) => registerFile(deps, fileId, localPath),
    evictIfNeeded: () => evictIfNeeded(deps),
    removeFile: (fileId: string) => removeFile(deps, fileId),
  } as const;
}

async function getCachedPath(deps: CacheManagerDependencies, fileId: string): Promise<string | null> {
  const entry = await deps.cacheRepository.getEntry(fileId);
  if (!entry) return null;
  const exists = await deps.fileOperations.exists(entry.local_path);
  if (!exists) {
    await deps.cacheRepository.deleteEntry(fileId);
    return null;
  }
  await deps.cacheRepository.touchEntry(fileId);
  return entry.local_path;
}

async function registerFile(deps: CacheManagerDependencies, fileId: string, localPath: string): Promise<void> {
  const fileSize = await deps.fileOperations.getFileSize(localPath);
  const now = Date.now();
  await deps.cacheRepository.insertEntry({
    file_id: fileId,
    local_path: localPath,
    file_size: fileSize,
    created_at: now,
    last_accessed_at: now,
  });
}

async function evictIfNeeded(deps: CacheManagerDependencies): Promise<void> {
  if (!deps.maxCacheSizeBytes) return;
  let totalSize = await deps.cacheRepository.getTotalSize();
  if (totalSize <= deps.maxCacheSizeBytes) return;

  const candidates = await deps.cacheRepository.getEvictionCandidates(20);
  for (const candidate of candidates) {
    if (totalSize <= deps.maxCacheSizeBytes) break;
    await removeFileEntry(deps, candidate.file_id, candidate.local_path);
    totalSize -= candidate.file_size;
    Logger.debug('Evicted cached file', { tag: TAG, data: { fileId: candidate.file_id } });
  }
}

async function removeFile(deps: CacheManagerDependencies, fileId: string): Promise<void> {
  const entry = await deps.cacheRepository.getEntry(fileId);
  if (!entry) return;
  await removeFileEntry(deps, fileId, entry.local_path);
}

async function removeFileEntry(deps: CacheManagerDependencies, fileId: string, localPath: string): Promise<void> {
  try {
    await deps.fileOperations.deleteFile(localPath);
  } catch {
    Logger.debug('File already deleted during eviction', { tag: TAG, data: { fileId } });
  }
  await deps.cacheRepository.deleteEntry(fileId);
}
