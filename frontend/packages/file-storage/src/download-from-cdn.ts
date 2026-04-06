import { Logger } from '@ion/diagnostics';
import { validateCdnUrl } from './validate-cdn-url';
import type { FileOperations, DownloadProgressCallback } from './types';

const TAG = 'file-storage';

interface CdnDownloadOptions {
  fileOperations: FileOperations;
  url: string;
  destinationPath: string;
  signal: AbortSignal;
  onProgress?: DownloadProgressCallback | undefined;
  downloadId: string;
  fileId: string;
  totalBytes: number;
}

export async function downloadFromCdn(options: CdnDownloadOptions): Promise<void> {
  if (options.signal.aborted) throw new Error('Download cancelled');
  validateCdnUrl(options.url);
  Logger.info('Starting CDN download', { tag: TAG, data: { fileId: options.fileId } });

  await options.fileOperations.downloadToFile({
    url: options.url,
    destinationPath: options.destinationPath,
    signal: options.signal,
    onProgress: options.onProgress ? createProgressAdapter(options) : undefined,
  });

  Logger.info('CDN download complete', { tag: TAG, data: { fileId: options.fileId } });
}

function createProgressAdapter(options: CdnDownloadOptions): DownloadProgressCallback {
  return (progress) => {
    options.onProgress?.({
      downloadId: options.downloadId,
      fileId: options.fileId,
      status: 'downloading-cdn',
      bytesDownloaded: progress.bytesDownloaded,
      totalBytes: options.totalBytes,
    });
  };
}
