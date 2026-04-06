import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDownloadCanceller } from './cancel-download';
import { cancellationRegistry } from './cancellation-registry';
import type { FileStorageDependencies } from './types';
import type { Database } from '@ion/storage';

function createMockDeps(): FileStorageDependencies {
  return {
    httpClient: {} as never,
    database: {
      execute: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([{ status: 'cancelled' }]),
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

describe('createDownloadCanceller', () => {
  it('cancels an active download and returns true', async () => {
    cancellationRegistry.register('d1');
    const { cancelDownload } = createDownloadCanceller(createMockDeps());
    const result = await cancelDownload('d1');
    expect(result).toBe(true);
  });

  it('returns false for unknown download', async () => {
    const { cancelDownload } = createDownloadCanceller(createMockDeps());
    const result = await cancelDownload('nonexistent');
    expect(result).toBe(false);
  });
});
