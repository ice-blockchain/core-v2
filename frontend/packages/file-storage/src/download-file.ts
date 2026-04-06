import { Logger } from '@ion/diagnostics';
import { createDownloadQueueRepository } from './download-queue-repository';
import { createCacheRepository } from './cache-repository';
import { createCacheManager } from './cache-manager';
import { resolveFile } from './resolve-file';
import { downloadFromCdn } from './download-from-cdn';
import { downloadFromTon } from './download-from-ton';
import { cancellationRegistry } from './cancellation-registry';
import { generateDownloadId } from './generate-download-id';
import { buildCachePath } from './build-cache-path';
import { validateFileId } from './validate-file-id';
import type { FileStorageDependencies, DownloadProgressCallback, DownloadResult, DownloadStatus, FileResolution } from './types';

const TAG = 'file-storage';

interface DownloadContext {
  deps: FileStorageDependencies;
  repository: ReturnType<typeof createDownloadQueueRepository>;
  cacheManager: ReturnType<typeof createCacheManager>;
  downloadId: string;
  fileId: string;
  signal: AbortSignal;
  onProgress?: DownloadProgressCallback | undefined;
}

export function createFileDownloader(deps: FileStorageDependencies) {
  const repository = createDownloadQueueRepository(deps.database);
  const cacheRepository = createCacheRepository(deps.database);
  const cacheManager = createCacheManager({
    cacheRepository,
    fileOperations: deps.fileOperations,
    maxCacheSizeBytes: deps.maxCacheSizeBytes,
  });
  const inFlight = new Map<string, Promise<DownloadResult>>();

  async function downloadFile(fileId: string, onProgress?: DownloadProgressCallback): Promise<DownloadResult> {
    validateFileId(fileId);
    const cached = await checkCache(cacheManager, fileId, deps);
    if (cached) return cached;
    const existing = inFlight.get(fileId);
    if (existing) return existing;
    const promise = executeNewDownload({ deps, repository, cacheManager, fileId, onProgress })
      .finally(() => inFlight.delete(fileId));
    inFlight.set(fileId, promise);
    return promise;
  }

  return { downloadFile } as const;
}

async function checkCache(
  cacheManager: ReturnType<typeof createCacheManager>,
  fileId: string,
  deps: FileStorageDependencies,
): Promise<DownloadResult | null> {
  const cachedPath = await cacheManager.getCachedPath(fileId);
  if (!cachedPath) return null;
  const fileSize = await deps.fileOperations.getFileSize(cachedPath);
  return { fileId, localPath: cachedPath, fileSize };
}

async function executeNewDownload(options: {
  deps: FileStorageDependencies;
  repository: ReturnType<typeof createDownloadQueueRepository>;
  cacheManager: ReturnType<typeof createCacheManager>;
  fileId: string;
  onProgress?: DownloadProgressCallback | undefined;
}): Promise<DownloadResult> {
  const downloadId = generateDownloadId();
  const controller = cancellationRegistry.register(downloadId);
  const now = Date.now();

  await options.repository.insertItem({
    download_id: downloadId, file_id: options.fileId, status: 'queued',
    local_path: null, cdn_url: null, ton_bag_id: null, ton_file_index: null,
    file_size: 0, bytes_downloaded: 0, error_message: null, retry_count: 0,
    created_at: now, updated_at: now,
  });

  const context: DownloadContext = {
    deps: options.deps, repository: options.repository, cacheManager: options.cacheManager,
    downloadId, fileId: options.fileId, signal: controller.signal, onProgress: options.onProgress,
  };

  try {
    return await resolveAndDownload(context);
  } catch (error) {
    await handleDownloadError(context, error);
    throw error;
  } finally {
    cancellationRegistry.remove(context.downloadId);
  }
}

async function resolveAndDownload(context: DownloadContext): Promise<DownloadResult> {
  await context.repository.updateStatus(context.downloadId, 'resolving');
  emitProgress(context, { status: 'resolving', bytesDownloaded: 0, totalBytes: 0 });

  const resolution = await resolveFile(context.deps.httpClient, context.deps.apiBaseUrl, context.fileId);
  await context.repository.updateResolution(context.downloadId, {
    cdnUrl: resolution.cdnUrl, tonBagId: resolution.tonBagId,
    tonFileIndex: resolution.tonFileIndex, fileSize: resolution.fileSize,
  });

  const localPath = buildCachePath(context.deps.cacheDirectoryPath, context.fileId);
  const downloaded = await attemptDownload(context, resolution, localPath);
  if (!downloaded) throw new Error(`No download source available for file ${context.fileId}`);

  return await completeDownload(context, localPath, resolution.fileSize);
}

async function attemptDownload(context: DownloadContext, resolution: FileResolution, localPath: string): Promise<boolean> {
  if (resolution.cdnUrl) {
    const cdnSuccess = await attemptCdnDownload(context, resolution, localPath);
    if (cdnSuccess) return true;
  }
  if (resolution.tonBagId !== null && resolution.tonFileIndex !== null) {
    await attemptTonDownload(context, resolution, localPath);
    return true;
  }
  return resolution.cdnUrl !== null;
}

async function attemptCdnDownload(context: DownloadContext, resolution: FileResolution, localPath: string): Promise<boolean> {
  try {
    await context.repository.updateStatus(context.downloadId, 'downloading-cdn');
    emitProgress(context, { status: 'downloading-cdn', bytesDownloaded: 0, totalBytes: resolution.fileSize });
    await downloadFromCdn({
      fileOperations: context.deps.fileOperations, url: resolution.cdnUrl!,
      destinationPath: localPath, signal: context.signal,
      onProgress: context.onProgress, downloadId: context.downloadId,
      fileId: context.fileId, totalBytes: resolution.fileSize,
    });
    return true;
  } catch (error) {
    Logger.warning('CDN download failed, trying TON fallback', { tag: TAG, data: { fileId: context.fileId, error: (error as Error).message } });
    return false;
  }
}

async function attemptTonDownload(context: DownloadContext, resolution: FileResolution, localPath: string): Promise<void> {
  await context.repository.updateStatus(context.downloadId, 'downloading-ton');
  emitProgress(context, { status: 'downloading-ton', bytesDownloaded: 0, totalBytes: resolution.fileSize });
  await downloadFromTon({
    tonStorageClient: context.deps.tonStorageClient, fileOperations: context.deps.fileOperations,
    bagId: resolution.tonBagId!, fileIndex: resolution.tonFileIndex!,
    downloadPath: context.deps.cacheDirectoryPath, destinationPath: localPath,
    signal: context.signal, onProgress: context.onProgress,
    downloadId: context.downloadId, fileId: context.fileId, totalBytes: resolution.fileSize,
  });
}

async function completeDownload(context: DownloadContext, localPath: string, fileSize: number): Promise<DownloadResult> {
  await context.repository.updateCompletion(context.downloadId, localPath);
  await context.cacheManager.registerFile(context.fileId, localPath);
  await context.cacheManager.evictIfNeeded();
  emitProgress(context, { status: 'completed', bytesDownloaded: fileSize, totalBytes: fileSize });
  Logger.info('File download complete', { tag: TAG, data: { fileId: context.fileId } });
  return { fileId: context.fileId, localPath, fileSize };
}

async function handleDownloadError(context: DownloadContext, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const isCancelled = context.signal.aborted;
  const status: DownloadStatus = isCancelled ? 'cancelled' : 'failed';
  const wasUpdated = await context.repository.updateStatusIfNotTerminal(context.downloadId, status);
  if (!isCancelled && wasUpdated) await context.repository.updateFailure(context.downloadId, message);
  Logger.error('File download failed', { tag: TAG, data: { fileId: context.fileId, error: message } });
}

function emitProgress(context: DownloadContext, options: { status: DownloadStatus; bytesDownloaded: number; totalBytes: number }): void {
  context.onProgress?.({ downloadId: context.downloadId, fileId: context.fileId, ...options });
}
