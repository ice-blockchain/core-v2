import { generatePulseTestUser } from './data-generator';
import type {
  ClientWorkerConfig,
  ClientWorkerInstance,
  ClientWorkerMetrics,
} from './types';

function createEmptyMetrics(): ClientWorkerMetrics {
  return {
    requestCount: 0,
    errorCount: 0,
    latencies: [],
  };
}

function buildUrl(baseUrl: string, path: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}${path}`;
}

async function timedFetch(
  url: string,
  options: RequestInit,
  metrics: ClientWorkerMetrics,
): Promise<Response> {
  const startTime = performance.now();
  metrics.requestCount += 1;

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    metrics.latencies.push(performance.now() - startTime);
    metrics.errorCount += 1;
    throw error;
  }

  metrics.latencies.push(performance.now() - startTime);

  if (!response.ok) {
    metrics.errorCount += 1;
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

function createPutNodeHandler(
  relayUrl: string,
  metrics: ClientWorkerMetrics,
) {
  return async (
    soul: string,
    data: Record<string, unknown>,
  ): Promise<void> => {
    const url = buildUrl(relayUrl, '/put');
    await timedFetch(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soul, data }),
      },
      metrics,
    );
  };
}

function createGetNodeHandler(
  relayUrl: string,
  metrics: ClientWorkerMetrics,
) {
  return async (
    soul: string,
  ): Promise<Record<string, unknown> | null> => {
    const url = buildUrl(relayUrl, `/get/${encodeURIComponent(soul)}`);
    const response = await timedFetch(
      url,
      { method: 'GET' },
      metrics,
    );

    const body = await response.json();
    return (body as Record<string, unknown>) ?? null;
  };
}

function createDeleteNodeHandler(
  relayUrl: string,
  metrics: ClientWorkerMetrics,
) {
  return async (soul: string): Promise<void> => {
    const url = buildUrl(
      relayUrl,
      `/delete/${encodeURIComponent(soul)}`,
    );
    await timedFetch(url, { method: 'DELETE' }, metrics);
  };
}

function createQueryNodesHandler(
  relayUrl: string,
  metrics: ClientWorkerMetrics,
) {
  return async (
    prefix: string,
  ): Promise<Record<string, unknown>[]> => {
    const encoded = encodeURIComponent(prefix);
    const url = buildUrl(relayUrl, `/query?prefix=${encoded}`);
    const response = await timedFetch(
      url,
      { method: 'GET' },
      metrics,
    );

    const body = await response.json();
    return (body as Record<string, unknown>[]) ?? [];
  };
}

export function createClientWorker(
  config: ClientWorkerConfig,
): ClientWorkerInstance {
  const user = config.userId
    ? { userId: config.userId }
    : generatePulseTestUser();

  const metrics = createEmptyMetrics();

  return {
    userId: user.userId,
    putNode: createPutNodeHandler(config.relayUrl, metrics),
    getNode: createGetNodeHandler(config.relayUrl, metrics),
    deleteNode: createDeleteNodeHandler(config.relayUrl, metrics),
    queryNodes: createQueryNodesHandler(config.relayUrl, metrics),
    getMetrics: () => ({ ...metrics, latencies: [...metrics.latencies] }),
    stop: () => {
      // No persistent connections to clean up with fetch-based client
    },
  };
}

export function stopClientWorker(
  worker: ClientWorkerInstance,
): void {
  worker.stop();
}
