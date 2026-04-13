import { Worker, Queue } from 'bullmq';
import type { Job } from 'bullmq';
import type Redis from 'ioredis';
import type { Logger } from 'pino';
import classifyContentType from './classify-event.js';
import resolveContentType from './resolve-content-type.js';
import resolveStorageProvider from './resolve-storage-provider.js';
import { pushAndGetLength } from './create-batch.js';
import { assembleBatch, getFlushQueueName } from './batch-assembler.js';
import validateEventPayload from './validate.js';
import type {
  CdnUploaderConfig,
  GreenfieldEventPayload,
  GreenfieldJobData,
  GreenfieldQueryClient,
  PendingUploadItem,
  UploadBatchJob,
} from './types.js';

interface RouterWorkerDeps {
  config: CdnUploaderConfig;
  redis: Redis;
  greenfieldClient: GreenfieldQueryClient;
  batchQueue: Queue<UploadBatchJob>;
  logger: Logger;
}

export default function createRouterWorker(
  deps: RouterWorkerDeps,
): Worker<GreenfieldJobData> {
  const { config, redis, logger } = deps;

  const flushQueue = new Queue(getFlushQueueName(), { connection: redis });

  const worker = new Worker<GreenfieldJobData>(
    config.sourceQueueName,
    async (job) => processEvent(job, deps, flushQueue),
    { connection: redis, concurrency: 10 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'router job failed');
  });

  return worker;
}

async function processEvent(
  job: Job<GreenfieldJobData>,
  deps: RouterWorkerDeps,
  flushQueue: Queue,
): Promise<void> {
  const { config, redis, greenfieldClient, batchQueue, logger } = deps;
  const data = validateEventPayload(job.data);
  const eventType = job.name;
  const { bucket_name: bucketName, object_name: objectName } = data;

  const contentType = await resolveEventContentType(
    data, bucketName, objectName, greenfieldClient, redis,
    config.allowedSpHostnamePattern,
  );

  const disposition = classifyContentType(contentType);
  logger.info(
    { eventType, bucketName, objectName, contentType, disposition },
    'event classified',
  );

  if (disposition === 'skip') {
    if (contentType === 'application/octet-stream') {
      logger.info({ bucketName, objectName }, 'skipped octet-stream content');
    }
    return;
  }

  const item: PendingUploadItem = {
    bucketName,
    objectName,
    payloadSize: data.payload_size,
    contentType,
    txHash: data.tx_hash,
    version: data.version,
    checksums: data.checksums,
  };

  const length = await pushAndGetLength(redis, JSON.stringify(item));

  if (length >= config.batchMaxSize) {
    await assembleBatch(redis, batchQueue, config, logger);
  } else {
    await scheduleDelayedFlush(flushQueue, config.batchFlushIntervalMs);
  }
}

async function scheduleDelayedFlush(
  flushQueue: Queue,
  delayMs: number,
): Promise<void> {
  await flushQueue.add('flush', {}, {
    delay: delayMs,
    jobId: 'pending-flush',
    removeOnComplete: true,
    removeOnFail: true,
  });
}

async function resolveEventContentType(
  data: GreenfieldEventPayload,
  bucketName: string,
  objectName: string,
  greenfieldClient: GreenfieldQueryClient,
  redis: Redis,
  allowedSpHostnamePattern?: string,
): Promise<string> {
  if ('content_type' in data && data.content_type) {
    return data.content_type;
  }

  const sp = await resolveStorageProvider(
    bucketName, greenfieldClient, redis, allowedSpHostnamePattern,
  );

  return resolveContentType({
    bucketName, objectName,
    spEndpoint: sp.endpoint, redis,
    validatedEndpoint: sp.validatedEndpoint,
  });
}
