import { unlink } from 'node:fs/promises';
import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import type Redis from 'ioredis';
import type { Logger } from 'pino';
import acquireItemLock from './acquire-item-lock.js';
import downloadFromGreenfield from './download-from-greenfield.js';
import resolveStorageProvider from './resolve-storage-provider.js';
import type { ResolvedStorageProvider } from './resolve-storage-provider.js';
import selectAndUpload from './select-upload-strategy.js';
import storeUploadMetadata from './store-upload-metadata.js';
import { assertSafeCdnPath, assertValidBucketName } from './validate.js';
import type { FtpPool } from './create-ftp-pool.js';
import type {
  CdnUploaderConfig,
  GreenfieldQueryClient,
  PendingUploadItem,
  UploadBatchJob,
} from './types.js';

const BATCH_QUEUE_NAME = 'cdn-batches';
const DEAD_LETTER_KEY = 'cdn:dead-letter-uploads';
const DEAD_LETTER_MAX_SIZE = 10_000;
const MAX_RETRIES = 3;

export default function createUploadWorker(
  config: CdnUploaderConfig,
  redis: Redis,
  greenfieldClient: GreenfieldQueryClient,
  ftpPool: FtpPool,
  logger: Logger,
): Worker<UploadBatchJob> {
  const worker = new Worker<UploadBatchJob>(
    BATCH_QUEUE_NAME,
    async (job) => processBatch(job, config, redis, greenfieldClient, ftpPool, logger),
    { connection: redis, concurrency: config.uploadConcurrency },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'upload batch failed');
  });

  return worker;
}

async function processBatch(
  job: Job<UploadBatchJob>,
  config: CdnUploaderConfig,
  redis: Redis,
  greenfieldClient: GreenfieldQueryClient,
  ftpPool: FtpPool,
  logger: Logger,
): Promise<void> {
  const { items } = job.data;
  const completed = new Set<string>(getCompletedKeys(job));
  const failCounts = new Map<string, number>(Object.entries(getPersistedFailCounts(job)));
  const spCache = new Map<string, ResolvedStorageProvider>();
  const deadLettered: PendingUploadItem[] = [];
  let failCount = 0;

  for (const item of items) {
    const key = itemKey(item);
    if (completed.has(key)) continue;

    try {
      await processItem(item, config, redis, greenfieldClient, ftpPool, logger, spCache);
      completed.add(key);
      await updateProgress(job, completed, failCounts);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ item, err: message }, 'upload item failed');
      const retryCount = (failCounts.get(key) ?? 0) + 1;
      failCounts.set(key, retryCount);
      if (retryCount > MAX_RETRIES) {
        logger.warn({ item, retryCount }, 'item moved to dead-letter queue');
        deadLettered.push({ ...item, retryCount });
      } else {
        failCount++;
      }
      await updateProgress(job, completed, failCounts);
    }
  }

  await pushToDeadLetter(redis, deadLettered);

  if (failCount > 0) {
    throw new Error(`${failCount} item(s) failed, triggering batch retry`);
  }
}

export function itemKey(item: PendingUploadItem): string {
  return `${item.bucketName}:${item.objectName}:${item.version}`;
}

interface BatchProgress {
  completed?: string[];
  failCounts?: Record<string, number>;
}

export function getCompletedKeys(job: Job<UploadBatchJob>): string[] {
  const progress = job.progress as BatchProgress | undefined;
  return progress?.completed ?? [];
}

export function getPersistedFailCounts(job: Job<UploadBatchJob>): Record<string, number> {
  const progress = job.progress as BatchProgress | undefined;
  return progress?.failCounts ?? {};
}

async function updateProgress(
  job: Job<UploadBatchJob>,
  completed: Set<string>,
  failCounts: Map<string, number>,
): Promise<void> {
  await job.updateProgress({
    completed: [...completed],
    failCounts: Object.fromEntries(failCounts),
  });
}

async function processItem(
  item: PendingUploadItem,
  config: CdnUploaderConfig,
  redis: Redis,
  greenfieldClient: GreenfieldQueryClient,
  ftpPool: FtpPool,
  logger: Logger,
  spCache: Map<string, ResolvedStorageProvider>,
): Promise<void> {
  const lockKey = `${item.bucketName}:${item.objectName}:${item.version}`;
  const lock = await acquireItemLock(redis, lockKey);
  if (!lock.acquired) {
    logger.info({ item: lockKey }, 'item already locked, skipping');
    return;
  }

  try {
    await processItemCore(item, config, redis, greenfieldClient, ftpPool, logger, spCache);
  } finally {
    await lock.release();
  }
}

async function processItemCore(
  item: PendingUploadItem,
  config: CdnUploaderConfig,
  redis: Redis,
  greenfieldClient: GreenfieldQueryClient,
  ftpPool: FtpPool,
  logger: Logger,
  spCache: Map<string, ResolvedStorageProvider>,
): Promise<void> {
  const { bucketName, objectName, payloadSize, contentType, txHash, version, checksums } = item;

  assertValidBucketName(bucketName);
  const cdnPath = `${bucketName}/${objectName}`;
  assertSafeCdnPath(cdnPath);

  const sp = await resolveAndCacheProvider(
    bucketName, greenfieldClient, redis, config.allowedSpHostnamePattern, spCache,
  );

  const localPath = await downloadFromGreenfield({
    bucketName, objectName, payloadSize, spEndpoint: sp.endpoint,
    tempDir: config.tempDir, maxDownloadSize: config.maxDownloadSize,
    checksums, maxSegmentSize: config.maxSegmentSize,
    validatedEndpoint: sp.validatedEndpoint, logger,
  });

  const ftpClient = await ftpPool.acquire();
  try {
    const strategy = await selectAndUpload({
      localFilePath: localPath, cdnPath, config, ftpClient,
    });
    logger.info({ bucketName, objectName, strategy }, 'uploaded to CDN');
  } finally {
    await ftpPool.release(ftpClient);
    await unlink(localPath).catch((err) => {
      logger.debug({ err, localPath }, 'failed to unlink temp file');
    });
  }

  await storeUploadMetadata(redis, {
    bucketName, objectName, contentType, size: payloadSize,
    cdnPath, uploadedAt: Date.now(), txHash, version,
  });
}

async function resolveAndCacheProvider(
  bucketName: string,
  greenfieldClient: GreenfieldQueryClient,
  redis: Redis,
  allowedSpHostnamePattern: string,
  spCache: Map<string, ResolvedStorageProvider>,
): Promise<ResolvedStorageProvider> {
  const cached = spCache.get(bucketName);
  if (cached) return cached;

  const sp = await resolveStorageProvider(
    bucketName, greenfieldClient, redis, allowedSpHostnamePattern,
  );
  spCache.set(bucketName, sp);
  return sp;
}

async function pushToDeadLetter(
  redis: Redis,
  deadLettered: PendingUploadItem[],
): Promise<void> {
  if (deadLettered.length === 0) return;

  const pipeline = redis.pipeline();
  for (const item of deadLettered) {
    pipeline.rpush(DEAD_LETTER_KEY, JSON.stringify(item));
  }
  pipeline.ltrim(DEAD_LETTER_KEY, -DEAD_LETTER_MAX_SIZE, -1);
  await pipeline.exec();
}
