import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadFromTon } from './download-from-ton';
import type { FileOperations } from './types';
import type { TonStorageClient } from '@ion/ton-storage';

vi.mock('@ion/diagnostics', () => ({
  Logger: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function createMockFileOps(): FileOperations {
  return {
    exists: vi.fn().mockResolvedValue(false),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    getFileSize: vi.fn().mockResolvedValue(0),
    moveFile: vi.fn().mockResolvedValue(undefined),
    downloadToFile: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockTonClient(): TonStorageClient {
  return {
    addBag: vi.fn().mockResolvedValue(undefined),
    removeBag: vi.fn().mockResolvedValue(undefined),
    stopBag: vi.fn().mockResolvedValue(undefined),
    getBagDetails: vi.fn().mockResolvedValue({ isComplete: true, downloadedSize: 1024, totalSize: 1024 }),
    listBags: vi.fn().mockResolvedValue([]),
    getFilePath: vi.fn().mockReturnValue('/ton/bag123/0'),
  };
}

beforeEach(() => vi.clearAllMocks());

describe('downloadFromTon', () => {
  it('adds bag, polls until complete, and moves file', async () => {
    const fileOps = createMockFileOps();
    const tonClient = createMockTonClient();
    await downloadFromTon({
      tonStorageClient: tonClient, fileOperations: fileOps,
      bagId: 'bag123', fileIndex: 0, downloadPath: '/cache',
      destinationPath: '/cache/f1', signal: new AbortController().signal,
      downloadId: 'd1', fileId: 'f1', totalBytes: 1024,
    });
    expect(tonClient.addBag).toHaveBeenCalledWith(expect.objectContaining({ bagId: 'bag123', files: [0] }));
    expect(tonClient.getBagDetails).toHaveBeenCalledWith('bag123');
    expect(fileOps.moveFile).toHaveBeenCalledWith({ sourcePath: '/ton/bag123/0', destinationPath: '/cache/f1' });
  });

  it('throws when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(downloadFromTon({
      tonStorageClient: createMockTonClient(), fileOperations: createMockFileOps(),
      bagId: 'bag123', fileIndex: 0, downloadPath: '/cache',
      destinationPath: '/cache/f1', signal: controller.signal,
      downloadId: 'd1', fileId: 'f1', totalBytes: 1024,
    })).rejects.toThrow('Download cancelled');
  });
});
