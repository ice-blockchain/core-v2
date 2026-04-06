import { Logger } from '@ion/diagnostics';
import type { TonStorageClient } from '@ion/ton-storage';
import type { FileOperations, DownloadProgressCallback } from './types';

const TAG = 'file-storage';
const POLL_INTERVAL_MS = 2_000;

interface TonDownloadOptions {
  tonStorageClient: TonStorageClient;
  fileOperations: FileOperations;
  bagId: string;
  fileIndex: number;
  downloadPath: string;
  destinationPath: string;
  signal: AbortSignal;
  onProgress?: DownloadProgressCallback | undefined;
  downloadId: string;
  fileId: string;
  totalBytes: number;
}

export async function downloadFromTon(options: TonDownloadOptions): Promise<void> {
  if (options.signal.aborted) throw new Error('Download cancelled');
  Logger.info('Starting TON bag download', { tag: TAG, data: { fileId: options.fileId, bagId: options.bagId } });

  await options.tonStorageClient.addBag({
    bagId: options.bagId,
    downloadPath: options.downloadPath,
    files: [options.fileIndex],
  });

  await pollBagUntilComplete(options);
  await moveCompletedFile(options);
  Logger.info('TON download complete', { tag: TAG, data: { fileId: options.fileId } });
}

async function pollBagUntilComplete(options: TonDownloadOptions): Promise<void> {
  while (!options.signal.aborted) {
    const details = await options.tonStorageClient.getBagDetails(options.bagId);
    emitTonProgress(options, details.downloadedSize);
    if (details.isComplete) return;
    await delay(POLL_INTERVAL_MS);
  }
  throw new Error('Download cancelled');
}

function emitTonProgress(options: TonDownloadOptions, bytesDownloaded: number): void {
  options.onProgress?.({
    downloadId: options.downloadId,
    fileId: options.fileId,
    status: 'downloading-ton',
    bytesDownloaded,
    totalBytes: options.totalBytes,
  });
}

async function moveCompletedFile(options: TonDownloadOptions): Promise<void> {
  const sourcePath = options.tonStorageClient.getFilePath(options.bagId, options.fileIndex);
  await options.fileOperations.moveFile({ sourcePath, destinationPath: options.destinationPath });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
