import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import { freemem, totalmem } from 'node:os';
import type Redis from 'ioredis';

export interface Metrics {
  eventsRouted: Counter;
  uploadsTotal: Counter;
  batchSize: Histogram;
  uploadDuration: Histogram;
  queueDepth: Gauge;
  systemMemoryAvailable: Gauge;
  systemMemoryTotal: Gauge;
  registry: Registry;
}

export default function collectMetrics(redis: Redis): Metrics {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  return {
    ...createPipelineMetrics(registry),
    ...createQueueMetrics(registry, redis),
    ...createSystemMetrics(registry),
    registry,
  };
}

function createPipelineMetrics(registry: Registry) {
  const eventsRouted = new Counter({
    name: 'greenfield_processor_events_routed_total',
    help: 'Total greenfield events routed by type and disposition',
    labelNames: ['event_type', 'disposition'] as const,
    registers: [registry],
  });

  const uploadsTotal = new Counter({
    name: 'greenfield_processor_uploads_total',
    help: 'Total upload attempts by status and content type',
    labelNames: ['status', 'content_type'] as const,
    registers: [registry],
  });

  const batchSize = new Histogram({
    name: 'greenfield_processor_batch_size',
    help: 'Number of items per upload batch',
    buckets: [1, 5, 10, 15, 20],
    registers: [registry],
  });

  const uploadDuration = new Histogram({
    name: 'greenfield_processor_upload_duration_seconds',
    help: 'Time taken to upload a single file',
    buckets: [0.5, 1, 5, 10, 30, 60, 120, 300],
    registers: [registry],
  });

  return { eventsRouted, uploadsTotal, batchSize, uploadDuration };
}

function createQueueMetrics(registry: Registry, redis: Redis) {
  const queueDepth = new Gauge({
    name: 'greenfield_processor_queue_depth',
    help: 'Current queue depth',
    labelNames: ['queue'] as const,
    registers: [registry],
    async collect() {
      const [pending, deadLetter] = await Promise.all([
        redis.llen('cdn:pending-uploads'),
        redis.llen('cdn:dead-letter-uploads'),
      ]);
      this.set({ queue: 'pending' }, pending);
      this.set({ queue: 'dead-letter' }, deadLetter);
    },
  });

  return { queueDepth };
}

function createSystemMetrics(registry: Registry) {
  const systemMemoryAvailable = new Gauge({
    name: 'system_memory_available_bytes',
    help: 'Available system memory in bytes',
    registers: [registry],
    collect() {
      this.set(freemem());
    },
  });

  const systemMemoryTotal = new Gauge({
    name: 'system_memory_total_bytes',
    help: 'Total system memory in bytes',
    registers: [registry],
    collect() {
      this.set(totalmem());
    },
  });

  return { systemMemoryAvailable, systemMemoryTotal };
}
