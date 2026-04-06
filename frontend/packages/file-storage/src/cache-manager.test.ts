import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCacheManager } from './cache-manager';
import type { FileOperations } from './types';

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function createMockFileOps(): FileOperations {
  return {
    exists: vi.fn().mockResolvedValue(true),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    getFileSize: vi.fn().mockResolvedValue(1024),
    moveFile: vi.fn().mockResolvedValue(undefined),
    downloadToFile: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockCacheRepo() {
  return {
    insertEntry: vi.fn().mockResolvedValue(undefined),
    getEntry: vi.fn().mockResolvedValue(null),
    touchEntry: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    getTotalSize: vi.fn().mockResolvedValue(0),
    getEvictionCandidates: vi.fn().mockResolvedValue([]),
    getAllEntries: vi.fn().mockResolvedValue([]),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('createCacheManager', () => {
  it('returns null for uncached file', async () => {
    const manager = createCacheManager({ cacheRepository: createMockCacheRepo(), fileOperations: createMockFileOps(), maxCacheSizeBytes: undefined });
    const path = await manager.getCachedPath('f1');
    expect(path).toBeNull();
  });

  it('returns cached path and touches entry', async () => {
    const repo = createMockCacheRepo();
    repo.getEntry.mockResolvedValue({ file_id: 'f1', local_path: '/cache/f1', file_size: 1024, created_at: 0, last_accessed_at: 0 });
    const manager = createCacheManager({ cacheRepository: repo, fileOperations: createMockFileOps(), maxCacheSizeBytes: undefined });
    const path = await manager.getCachedPath('f1');
    expect(path).toBe('/cache/f1');
    expect(repo.touchEntry).toHaveBeenCalledWith('f1');
  });

  it('cleans stale entry when file missing from disk', async () => {
    const repo = createMockCacheRepo();
    repo.getEntry.mockResolvedValue({ file_id: 'f1', local_path: '/cache/f1', file_size: 1024, created_at: 0, last_accessed_at: 0 });
    const fileOps = createMockFileOps();
    vi.mocked(fileOps.exists).mockResolvedValue(false);
    const manager = createCacheManager({ cacheRepository: repo, fileOperations: fileOps, maxCacheSizeBytes: undefined });
    const path = await manager.getCachedPath('f1');
    expect(path).toBeNull();
    expect(repo.deleteEntry).toHaveBeenCalledWith('f1');
  });

  it('evicts oldest files when over budget', async () => {
    const repo = createMockCacheRepo();
    repo.getTotalSize.mockResolvedValue(2000);
    repo.getEvictionCandidates.mockResolvedValue([
      { file_id: 'old1', local_path: '/cache/old1', file_size: 800, created_at: 0, last_accessed_at: 100 },
      { file_id: 'old2', local_path: '/cache/old2', file_size: 800, created_at: 0, last_accessed_at: 200 },
    ]);
    const fileOps = createMockFileOps();
    const manager = createCacheManager({ cacheRepository: repo, fileOperations: fileOps, maxCacheSizeBytes: 1000 });
    await manager.evictIfNeeded();
    expect(fileOps.deleteFile).toHaveBeenCalledWith('/cache/old1');
    expect(repo.deleteEntry).toHaveBeenCalledWith('old1');
    expect(fileOps.deleteFile).toHaveBeenCalledWith('/cache/old2');
  });

  it('skips eviction when no limit set', async () => {
    const repo = createMockCacheRepo();
    const manager = createCacheManager({ cacheRepository: repo, fileOperations: createMockFileOps(), maxCacheSizeBytes: undefined });
    await manager.evictIfNeeded();
    expect(repo.getTotalSize).not.toHaveBeenCalled();
  });

  it('registers a file in the cache', async () => {
    const repo = createMockCacheRepo();
    const manager = createCacheManager({ cacheRepository: repo, fileOperations: createMockFileOps(), maxCacheSizeBytes: undefined });
    await manager.registerFile('f1', '/cache/f1');
    expect(repo.insertEntry).toHaveBeenCalledWith(expect.objectContaining({ file_id: 'f1', local_path: '/cache/f1' }));
  });
});
