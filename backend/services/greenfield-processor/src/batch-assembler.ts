import { Queue, Worker } from 'bullmq';
import type Redis from 'ioredis';
import type { Logger } from 'pino';
import createBatch from './create-batch.js';
import type { CdnUploaderConfig, UploadBatchJob } from './types.js';

const BATCH_QUEUE_NAME = 'cdn-batches';
const FLUSH_QUEUE_NAME = 'cdn-batch-flush';

export interface BatchAssemblerHandles {
  batchQueue: Queue<UploadBatchJob>;
  flushWorker: Worker;
}

export default function createBatchAssembler(
  config: CdnUploaderConfig,
  redis: Redis,
  logger: Logger,
): BatchAssemblerHandles {
  const batchQueue = new Queue<UploadBatchJob>(BATCH_QUEUE_NAME, {
    connection: redis,
  });

  const flushWorker = new Worker(
    FLUSH_QUEUE_NAME,
    async () => assembleBatch(redis, batchQueue, config, logger),
    { connection: redis, concurrency: 1 },
  );

  flushWorker.on('failed', (_job, err) => {
    logger.error({ err: err.message }, 'batch flush failed');
  });

  return { batchQueue, flushWorker };
}

export async function assembleBatch(
  redis: Redis,
  batchQueue: Queue<UploadBatchJob>,
  config: CdnUploaderConfig,
  logger: Logger,
): Promise<void> {
  const items = await createBatch(redis, config.batchMaxSize);
  if (items.length === 0) return;

  await batchQueue.add('upload-batch', {
    items,
    createdAt: Date.now(),
  }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  });

  logger.info({ batchSize: items.length }, 'batch created');
}

export function getFlushQueueName(): string {
  return FLUSH_QUEUE_NAME;
}
