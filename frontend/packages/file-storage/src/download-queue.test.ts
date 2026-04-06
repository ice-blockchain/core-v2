import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDownloadQueueInspector } from './download-queue';
import type { FileStorageDependencies, DownloadQueueRecord } from './types';
import type { Database } from '@ion/storage';

const mockRecords: DownloadQueueRecord[] = [
  {
    download_id: 'd1', file_id: 'f1', status: 'downloading-cdn', local_path: null,
    cdn_url: 'https://cdn/f1', ton_bag_id: null, ton_file_index: null,
    file_size: 2048, bytes_downloaded: 512, error_message: null, retry_count: 0,
    created_at: 1000, updated_at: 2000,
  },
];

function createMockDeps(): FileStorageDependencies {
  return {
    httpClient: {} as never,
    database: {
      execute: vi.fn(),
      query: vi.fn().mockResolvedValue(mockRecords),
      executeBatch: vi.fn(),
      transaction: vi.fn(),
    } as unknown as Database,
    apiBaseUrl: '',
    tonStorageClient: {} as never,
    fileOperations: {} as never,
    cacheDirectoryPath: '/cache',
  };
}

beforeEach(() => vi.clearAllMocks());

describe('createDownloadQueueInspector', () => {
  it('returns mapped download progress items', async () => {
    const { getDownloadQueue } = createDownloadQueueInspector(createMockDeps());
    const queue = await getDownloadQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.downloadId).toBe('d1');
    expect(queue[0]!.status).toBe('downloading-cdn');
    expect(queue[0]!.bytesDownloaded).toBe(512);
    expect(queue[0]!.totalBytes).toBe(2048);
  });
});
