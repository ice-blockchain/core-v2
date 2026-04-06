import { Logger } from '@ion/diagnostics';
import { createDownloadQueueRepository } from './download-queue-repository';
import { createCacheRepository } from './cache-repository';
import { createCacheManager } from './cache-manager';
import { resolveFile } from './resolve-file';
import { downloadFromCdn } from './download-from-cdn';
import { downloadFromTon } from './download-from-ton';
import { cancellationRegistry } from './cancellation-registry';
import { buildCachePath } from './build-cache-path';
import type { FileStorageDependencies, DownloadResult, DownloadQueueRecord, FileResolution } from './types';

const TAG = 'file-storage';
const MAX_RETRIES = 5;

interface RetryContext {
  deps: FileStorageDependencies;
  repository: ReturnType<typeof createDownloadQueueRepository>;
  cacheManager: ReturnType<typeof createCacheManager>;
}

export function createDownloadRetrier(deps: FileStorageDependencies) {
  const repository = createDownloadQueueRepository(deps.database);
  const cacheRepository = createCacheRepository(deps.database);
  const cacheManager = createCacheManager({
    cacheRepository,
    fileOperations: deps.fileOperations,
    maxCacheSizeBytes: deps.maxCacheSizeBytes,
  });
  const context: RetryContext = { deps, repository, cacheManager };

  async function retryFailedDownloads(): Promise<DownloadResult[]> {
    const failedItems = await repository.getItemsByStatus('failed');
    const results: DownloadResult[] = [];
    for (const item of failedItems) {
      if (item.retry_count >= MAX_RETRIES) continue;
      await delayWithBackoff(item.retry_count);
      const result = await retryItem(context, item);
      if (result) results.push(result);
    }
    return results;
  }

  return { retryFailedDownloads } as const;
}

async function retryItem(context: RetryContext, item: DownloadQueueRecord): Promise<DownloadResult | null> {
  try {
    return await executeRetry(context, item);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await context.repository.updateFailure(item.download_id, message);
    Logger.error('Download retry failed', { tag: TAG, data: { downloadId: item.download_id, error: message } });
    return null;
  }
}

async function executeRetry(context: RetryContext, item: DownloadQueueRecord): Promise<DownloadResult> {
  const controller = cancellationRegistry.register(item.download_id);
  try {
    const resolution = await resolveFile(context.deps.httpClient, context.deps.apiBaseUrl, item.file_id);
    await context.repository.updateResolution(item.download_id, {
      cdnUrl: resolution.cdnUrl, tonBagId: resolution.tonBagId,
      tonFileIndex: resolution.tonFileIndex, fileSize: resolution.fileSize,
    });

    const localPath = buildCachePath(context.deps.cacheDirectoryPath, item.file_id);
    const retryOptions: RetryDownloadOptions = {
      deps: context.deps, item, resolution, localPath, signal: controller.signal,
    };
    const downloaded = await attemptRetryDownload(retryOptions);
    if (!downloaded) throw new Error(`No download source for ${item.file_id}`);

    await context.repository.updateCompletion(item.download_id, localPath);
    await context.cacheManager.registerFile(item.file_id, localPath);
    return { fileId: item.file_id, localPath, fileSize: resolution.fileSize };
  } finally {
    cancellationRegistry.remove(item.download_id);
  }
}

const RETRY_BASE_DELAY_MS = 1_000;

function delayWithBackoff(retryCount: number): Promise<void> {
  const exponential = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
  const jitter = Math.random() * RETRY_BASE_DELAY_MS * 0.3;
  return new Promise((resolve) => setTimeout(resolve, exponential + jitter));
}

interface RetryDownloadOptions {
  deps: FileStorageDependencies;
  item: DownloadQueueRecord;
  resolution: FileResolution;
  localPath: string;
  signal: AbortSignal;
}

async function attemptRetryDownload(options: RetryDownloadOptions): Promise<boolean> {
  if (options.resolution.cdnUrl) {
    const cdnSuccess = await tryCdnRetry(options);
    if (cdnSuccess) return true;
  }
  if (options.resolution.tonBagId && options.resolution.tonFileIndex !== null) {
    await downloadFromTon({
      tonStorageClient: options.deps.tonStorageClient, fileOperations: options.deps.fileOperations,
      bagId: options.resolution.tonBagId, fileIndex: options.resolution.tonFileIndex,
      downloadPath: options.deps.cacheDirectoryPath, destinationPath: options.localPath,
      signal: options.signal, downloadId: options.item.download_id,
      fileId: options.item.file_id, totalBytes: options.resolution.fileSize,
    });
    return true;
  }
  return false;
}

async function tryCdnRetry(options: RetryDownloadOptions): Promise<boolean> {
  try {
    await downloadFromCdn({
      fileOperations: options.deps.fileOperations, url: options.resolution.cdnUrl!,
      destinationPath: options.localPath, signal: options.signal, downloadId: options.item.download_id,
      fileId: options.item.file_id, totalBytes: options.resolution.fileSize,
    });
    return true;
  } catch {
    Logger.warning('CDN retry failed, trying TON', { tag: TAG });
    return false;
  }
}
