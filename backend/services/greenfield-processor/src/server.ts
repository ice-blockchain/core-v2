import Fastify from 'fastify';
import pino from 'pino';
// @ts-expect-error -- no type declarations published
import { Client } from '@bnb-chain/greenfield-js-sdk';
import loadConfig from './config.js';
import cleanupStaleFiles from './cleanup-stale-files.js';
import createRedisClient from './create-redis-client.js';
import createRouterWorker from './router-worker.js';
import createBatchAssembler from './batch-assembler.js';
import createUploadWorker from './upload-worker.js';
import createFtpPool from './create-ftp-pool.js';
import collectMetrics from './collect-metrics.js';
import registerRoutes from './routes.js';
import type { GreenfieldQueryClient } from './types.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = pino({ level: config.logLevel });

  await cleanupStaleFiles({ tempDir: config.tempDir, logger });

  const redis = createRedisClient(config.redisUrl);
  const greenfieldClient = createGreenfieldClient(config);
  const ftpPool = createFtpPool({
    host: config.bunnyFtpHost,
    user: config.bunnyStorageZone,
    password: config.bunnyStoragePassword,
    secure: config.ftpSecure,
    maxConnections: config.ftpMaxConnections,
  });
  const metrics = collectMetrics(redis);

  const { batchQueue, flushWorker } = createBatchAssembler(
    config, redis, logger,
  );
  const routerWorker = createRouterWorker({
    config, redis, greenfieldClient, batchQueue, logger,
  });
  const uploadWorker = createUploadWorker(
    config, redis, greenfieldClient, ftpPool, logger,
  );

  const app = Fastify({ logger: false });
  registerRoutes(app, {
    redis,
    registry: metrics.registry,
    isHealthy: () => areWorkersRunning(routerWorker, uploadWorker, flushWorker),
  });

  await app.listen({ port: config.port, host: '0.0.0.0' });
  logger.info({ port: config.port }, 'greenfield-processor started');

  const shutdown = createShutdown(
    [routerWorker, uploadWorker, flushWorker],
    [redis, app, ftpPool, batchQueue],
    logger,
  );

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

function createGreenfieldClient(
  config: { greenfieldRpcUrl: string; greenfieldChainId: string },
): GreenfieldQueryClient {
  return Client.create(
    config.greenfieldRpcUrl,
    config.greenfieldChainId,
  ) as unknown as GreenfieldQueryClient;
}

function areWorkersRunning(
  ...workers: { isRunning(): boolean }[]
): boolean {
  return workers.every((w) => w.isRunning());
}

function createShutdown(
  workers: { close: () => Promise<void> }[],
  resources: { close?: () => Promise<void>; quit?: () => Promise<unknown>; drain?: () => Promise<void> }[],
  logger: pino.Logger,
): () => Promise<void> {
  let shuttingDown = false;

  return async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutting down');

    for (const worker of workers) {
      await worker.close().catch((err) => {
        logger.error({ err }, 'worker close error');
      });
    }

    for (const resource of resources) {
      const closeFn = resource.close ?? resource.quit ?? resource.drain;
      if (closeFn) {
        await closeFn.call(resource).catch((err: unknown) => {
          logger.error({ err }, 'resource close error');
        });
      }
    }

    logger.info('shutdown complete');
    process.exit(0);
  };
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
