import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFileDownloader } from './download-file';
import type { FileStorageDependencies, FileOperations } from './types';
import type { HttpClient } from '@ion/network';
import type { TonStorageClient } from '@ion/ton-storage';

vi.mock('./resolve-file', () => ({
  resolveFile: vi.fn().mockResolvedValue({
    fileId: 'f1', cdnUrl: 'https://cdn/f1', tonBagId: 'bag1', tonFileIndex: 0, fileSize: 2048, mimeType: 'image/png',
  }),
}));

vi.mock('./download-from-cdn', () => ({
  downloadFromCdn: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./download-from-ton', () => ({
  downloadFromTon: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./generate-download-id', () => ({
  generateDownloadId: () => 'test-download-id',
}));

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { downloadFromCdn } = await import('./download-from-cdn');
const { downloadFromTon } = await import('./download-from-ton');
const mockCdnDownload = vi.mocked(downloadFromCdn);
const mockTonDownload = vi.mocked(downloadFromTon);

function createMockDatabase() {
  const store = new Map<string, Record<string, unknown>>();
  return {
    execute: vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('INSERT INTO download_queue')) store.set(params?.[0] as string, { status: params?.[2] });
      if (sql.includes('INSERT') && sql.includes('file_cache')) return;
      if (sql.includes('UPDATE')) return;
      if (sql.includes('DELETE')) return;
    }),
    query: vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('file_cache') && sql.includes('WHERE file_id')) return [];
      if (sql.includes('SUM')) return [{ total: 0 }];
      if (sql.includes('download_queue') && params?.[0]) return [{ ...store.get(params[0] as string), status: 'queued' }];
      return [];
    }),
    executeBatch: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn(async <T>(fn: (tx: unknown) => Promise<T>) => fn({ execute: vi.fn(), query: vi.fn().mockResolvedValue([]) })),
  };
}

function createMockFileOps(): FileOperations {
  return {
    exists: vi.fn().mockResolvedValue(false),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    getFileSize: vi.fn().mockResolvedValue(2048),
    moveFile: vi.fn().mockResolvedValue(undefined),
    downloadToFile: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDeps(): FileStorageDependencies {
  return {
    httpClient: { get: vi.fn(), post: vi.fn(), head: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), upload: vi.fn() } as unknown as HttpClient,
    database: createMockDatabase() as never,
    apiBaseUrl: 'https://api.ion.app',
    tonStorageClient: { addBag: vi.fn(), removeBag: vi.fn(), stopBag: vi.fn(), getBagDetails: vi.fn(), listBags: vi.fn(), getFilePath: vi.fn() } as unknown as TonStorageClient,
    fileOperations: createMockFileOps(),
    cacheDirectoryPath: '/cache',
  };
}

beforeEach(() => vi.clearAllMocks());

describe('createFileDownloader', () => {
  it('downloads file via CDN and returns result', async () => {
    const deps = createMockDeps();
    const { downloadFile } = createFileDownloader(deps);
    const result = await downloadFile('f1');
    expect(mockCdnDownload).toHaveBeenCalled();
    expect(result.fileId).toBe('f1');
    expect(result.localPath).toBe('/cache/f1');
  });

  it('falls back to TON when CDN fails', async () => {
    mockCdnDownload.mockRejectedValueOnce(new Error('CDN unavailable'));
    const deps = createMockDeps();
    const { downloadFile } = createFileDownloader(deps);
    const result = await downloadFile('f1');
    expect(mockTonDownload).toHaveBeenCalled();
    expect(result.fileId).toBe('f1');
  });

  it('returns cached file without downloading', async () => {
    const deps = createMockDeps();
    vi.mocked(deps.database.query).mockImplementation(async (sql: string) => {
      if (sql.includes('file_cache') && sql.includes('WHERE file_id')) {
        return [{ file_id: 'f1', local_path: '/cache/f1', file_size: 2048, created_at: 0, last_accessed_at: 0 }] as never;
      }
      if (sql.includes('SUM')) return [{ total: 0 }] as never;
      return [] as never;
    });
    vi.mocked(deps.fileOperations.exists).mockResolvedValue(true);
    const { downloadFile } = createFileDownloader(deps);
    const result = await downloadFile('f1');
    expect(result.localPath).toBe('/cache/f1');
    expect(mockCdnDownload).not.toHaveBeenCalled();
    expect(mockTonDownload).not.toHaveBeenCalled();
  });

  it('emits progress through download stages', async () => {
    const deps = createMockDeps();
    const { downloadFile } = createFileDownloader(deps);
    const statuses: string[] = [];
    await downloadFile('f1', (p) => statuses.push(p.status));
    expect(statuses).toContain('resolving');
    expect(statuses).toContain('downloading-cdn');
    expect(statuses).toContain('completed');
  });
});
