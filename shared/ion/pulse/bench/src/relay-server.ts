import http from 'node:http';
import { createPulseGraph } from '../../graph/src/index';
import { createPulseSync } from '../../sync/src/index';
import { createInMemoryMeshNode } from '../../mesh/src/index';
import { createPulseSignal } from '../../signal/src/index';
import { createPulseShardRing } from '../../shard/src/index';
import { createPulseCache } from '../../cache/src/index';
import { createPulseReaper } from '../../reaper/src/index';
import type { PulseGraph } from '../../graph/src/index';
import type { PulseMeshNode } from '../../mesh/src/index';
import type { PulseSignalInstance } from '../../signal/src/index';
import type { PulseShardRing } from '../../shard/src/index';
import type { PulseCacheInstance } from '../../cache/src/index';
import type { PulseReaperInstance } from '../../reaper/src/index';

interface RelayContext {
  readonly peerId: string;
  readonly graph: PulseGraph;
  readonly meshNode: PulseMeshNode;
  readonly signal: PulseSignalInstance;
  readonly shardRing: PulseShardRing;
  readonly cache: PulseCacheInstance;
  readonly reaper: PulseReaperInstance;
}

function readRequestBody(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString()));
    request.on('error', reject);
  });
}

function sendJsonResponse(response: http.ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function parseSoulFromPath(pathname: string, prefix: string): string | undefined {
  if (!pathname.startsWith(prefix)) return undefined;
  return decodeURIComponent(pathname.slice(prefix.length));
}

async function handlePutRequest(context: RelayContext, request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
  const rawBody = await readRequestBody(request);
  const { soul, data } = JSON.parse(rawBody);

  if (!soul || !data) {
    sendJsonResponse(response, 400, { error: 'Missing soul or data' });
    return;
  }

  const node = context.graph.put(soul, data);
  context.cache.set(soul, node);
  context.signal.notify(soul, node);
  sendJsonResponse(response, 200, { ok: true, node });
}

function handleGetRequest(context: RelayContext, pathname: string, response: http.ServerResponse): void {
  const soul = parseSoulFromPath(pathname, '/get/');
  if (!soul) {
    sendJsonResponse(response, 400, { error: 'Missing soul parameter' });
    return;
  }

  const cached = context.cache.get(soul);
  if (cached) {
    sendJsonResponse(response, 200, { node: cached, source: 'cache' });
    return;
  }

  const node = context.graph.get(soul);
  if (!node) {
    sendJsonResponse(response, 404, { error: 'Node not found' });
    return;
  }

  context.cache.set(soul, node);
  sendJsonResponse(response, 200, { node, source: 'graph' });
}

function handleDeleteRequest(context: RelayContext, pathname: string, response: http.ServerResponse): void {
  const soul = parseSoulFromPath(pathname, '/delete/');
  if (!soul) {
    sendJsonResponse(response, 400, { error: 'Missing soul parameter' });
    return;
  }

  context.graph.delete(soul);
  context.cache.invalidate(soul);
  context.signal.notify(soul, null);
  sendJsonResponse(response, 200, { ok: true, soul });
}

function handleQueryRequest(context: RelayContext, searchParams: URLSearchParams, response: http.ServerResponse): void {
  const prefix = searchParams.get('prefix');
  if (!prefix) {
    sendJsonResponse(response, 400, { error: 'Missing prefix parameter' });
    return;
  }

  const limitRaw = searchParams.get('limit');
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
  const nodes = context.graph.query({ prefix, limit });
  sendJsonResponse(response, 200, { nodes, count: nodes.length });
}

function handleHealthRequest(context: RelayContext, response: http.ServerResponse): void {
  sendJsonResponse(response, 200, {
    status: 'healthy',
    peerId: context.peerId,
    uptime: process.uptime(),
  });
}

function handlePeersRequest(context: RelayContext, response: http.ServerResponse): void {
  sendJsonResponse(response, 200, {
    peerId: context.peerId,
    peerCount: context.meshNode.getPeerCount(),
    multiaddrs: context.meshNode.getMultiaddrs(),
    shardRelayCount: context.shardRing.getRelayCount(),
  });
}

function handleStatsRequest(context: RelayContext, response: http.ServerResponse): void {
  sendJsonResponse(response, 200, {
    cache: context.cache.getStats(),
    shardRelayCount: context.shardRing.getRelayCount(),
    pendingErasures: context.reaper.getPendingErasures().length,
  });
}

function routeGetRequest(
  context: RelayContext,
  pathname: string,
  searchParams: URLSearchParams,
  response: http.ServerResponse,
): void {
  if (pathname.startsWith('/get/')) return handleGetRequest(context, pathname, response);
  if (pathname === '/query') return handleQueryRequest(context, searchParams, response);
  if (pathname === '/health') return handleHealthRequest(context, response);
  if (pathname === '/peers') return handlePeersRequest(context, response);
  if (pathname === '/stats') return handleStatsRequest(context, response);
  sendJsonResponse(response, 404, { error: 'Not found' });
}

function routeRequest(
  context: RelayContext,
  request: http.IncomingMessage,
  response: http.ServerResponse,
): Promise<void> | void {
  const url = new URL(request.url ?? '/', `http://localhost`);
  const { pathname, searchParams } = url;
  const method = request.method ?? 'GET';

  if (method === 'POST' && pathname === '/put') {
    return handlePutRequest(context, request, response);
  }
  if (method === 'DELETE' && pathname.startsWith('/delete/')) {
    return handleDeleteRequest(context, pathname, response);
  }
  if (method === 'GET') {
    return routeGetRequest(context, pathname, searchParams, response);
  }

  sendJsonResponse(response, 404, { error: 'Not found' });
}

function createRelayContext(peerId: string, bootstrapPeers: string[]): RelayContext {
  const graph = createPulseGraph();
  const meshNode = createInMemoryMeshNode({ bootstrapPeers });
  const sync = createPulseSync({ documentId: peerId });
  void sync;

  const signal = createPulseSignal();
  const shardRing = createPulseShardRing();
  const cache = createPulseCache();
  const reaper = createPulseReaper();

  shardRing.addRelay(peerId);

  for (const peer of bootstrapPeers) {
    shardRing.addRelay(peer);
  }

  return { peerId, graph, meshNode, signal, shardRing, cache, reaper };
}

function parseBootstrapPeers(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((peer) => peer.trim()).filter(Boolean);
}

function startRelayServer(): void {
  const port = parseInt(process.env.PULSE_RELAY_PORT ?? '8080', 10);
  const peerId = process.env.PULSE_PEER_ID ?? `relay-${Date.now()}`;
  const bootstrapPeers = parseBootstrapPeers(process.env.PULSE_BOOTSTRAP_PEERS);

  const context = createRelayContext(peerId, bootstrapPeers);

  const server = http.createServer((request, response) => {
    const result = routeRequest(context, request, response);
    if (result instanceof Promise) {
      result.catch((error: Error) => {
        sendJsonResponse(response, 500, { error: error.message });
      });
    }
  });

  context.meshNode.start().then(() => {
    server.listen(port, () => {
      console.log(`Pulse relay ${peerId} listening on port ${port}`);
      console.log(`Bootstrap peers: ${bootstrapPeers.join(', ') || 'none'}`);
    });
  });
}

startRelayServer();
