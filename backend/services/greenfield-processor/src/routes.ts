import type { FastifyInstance } from 'fastify';
import type Redis from 'ioredis';
import type { Registry } from 'prom-client';

interface RouteDeps {
  redis: Redis;
  registry: Registry;
  isHealthy: () => boolean;
}

export default function registerRoutes(
  app: FastifyInstance,
  deps: RouteDeps,
): void {
  app.get('/health-check', async (_req, reply) => {
    const healthy = deps.isHealthy();
    if (!healthy) {
      return reply
        .status(503)
        .send({ ok: false, reason: 'workers not ready' });
    }

    try {
      await deps.redis.ping();
    } catch {
      return reply
        .status(503)
        .send({ ok: false, reason: 'redis unreachable' });
    }

    return reply.send({ ok: true });
  });

  app.get('/metrics', async (_req, reply) => {
    const metrics = await deps.registry.metrics();
    return reply.type('text/plain').send(metrics);
  });
}
