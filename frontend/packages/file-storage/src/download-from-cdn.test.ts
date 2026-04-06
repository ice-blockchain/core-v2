import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadFromCdn } from './download-from-cdn';
import type { FileOperations } from './types';

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

beforeEach(() => vi.clearAllMocks());

describe('downloadFromCdn', () => {
  it('calls fileOperations.downloadToFile with correct params', async () => {
    const fileOps = createMockFileOps();
    await downloadFromCdn({
      fileOperations: fileOps, url: 'https://cdn/file.png', destinationPath: '/cache/f1',
      signal: new AbortController().signal, downloadId: 'd1', fileId: 'f1', totalBytes: 1024,
    });
    expect(fileOps.downloadToFile).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://cdn/file.png', destinationPath: '/cache/f1',
    }));
  });

  it('throws when signal is already aborted', async () => {
    const fileOps = createMockFileOps();
    const controller = new AbortController();
    controller.abort();
    await expect(downloadFromCdn({
      fileOperations: fileOps, url: 'https://cdn/file.png', destinationPath: '/cache/f1',
      signal: controller.signal, downloadId: 'd1', fileId: 'f1', totalBytes: 1024,
    })).rejects.toThrow('Download cancelled');
  });
});
