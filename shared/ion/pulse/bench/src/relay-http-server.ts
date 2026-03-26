import http from 'node:http';
import { createPulseRelay } from './pulse-relay.js';
import type { PulseRelayInstance } from './pulse-relay.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const PEER_ID = process.env.PEER_ID ?? 'relay-0';

const relay = createPulseRelay({ peerId: PEER_ID });
console.log(`[${PEER_ID}] Relay created`);

const server = http.createServer(async (req, res) => {
  try {
    await routeRequest(req, res, relay);
  } catch (err) {
    respondJson(res, 500, { error: String(err) });
  }
});

server.listen(PORT, () => console.log(`[${PEER_ID}] Listening on :${PORT}`));

async function routeRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  instance: PulseRelayInstance,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const method = req.method ?? 'GET';

  if (method === 'GET' && url.pathname === '/health') {
    return respondJson(res, 200, { status: 'ok', peerId: PEER_ID });
  }
  if (method === 'POST' && url.pathname === '/put') {
    return handlePut(req, res, instance);
  }
  if (method === 'GET' && url.pathname === '/get') {
    return handleGet(url, res, instance);
  }
  if (method === 'POST' && url.pathname === '/sync/vector') {
    return handleSyncVector(res, instance);
  }
  if (method === 'POST' && url.pathname === '/sync/compute') {
    return handleSyncCompute(req, res, instance);
  }
  if (method === 'POST' && url.pathname === '/sync/apply') {
    return handleSyncApply(req, res, instance);
  }
  if (method === 'POST' && url.pathname === '/peer/add') {
    return handlePeerAdd(req, res, instance);
  }
  respondJson(res, 404, { error: 'not found' });
}

async function handlePut(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  instance: PulseRelayInstance,
): Promise<void> {
  const body = await readBody<{ soul: string; data: Record<string, unknown> }>(req);
  await instance.putData(body.soul, body.data);
  respondJson(res, 200, { ok: true });
}

function handleGet(
  url: URL,
  res: http.ServerResponse,
  instance: PulseRelayInstance,
): void {
  const soul = url.searchParams.get('soul') ?? '';
  const node = instance.graph.pulseGet(soul);
  respondJson(res, 200, { node });
}

function handleSyncVector(res: http.ServerResponse, instance: PulseRelayInstance): void {
  const vector = instance.sync.encodePulseStateVector();
  respondJson(res, 200, { vector: bufferToBase64(vector) });
}

async function handleSyncCompute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  instance: PulseRelayInstance,
): Promise<void> {
  const body = await readBody<{ vector: string }>(req);
  const vector = base64ToBuffer(body.vector);
  const update = instance.sync.computePulseSync(vector);
  respondJson(res, 200, { update: update ? bufferToBase64(update) : null });
}

async function handleSyncApply(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  instance: PulseRelayInstance,
): Promise<void> {
  const body = await readBody<{ update: string }>(req);
  const update = base64ToBuffer(body.update);
  instance.sync.applyPulseUpdate(update);
  respondJson(res, 200, { ok: true });
}

async function handlePeerAdd(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  instance: PulseRelayInstance,
): Promise<void> {
  const body = await readBody<{ peerId: string }>(req);
  instance.addPeer(body.peerId);
  respondJson(res, 200, { ok: true });
}

function respondJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString()) as T));
    req.on('error', reject);
  });
}

function bufferToBase64(buf: Uint8Array): string {
  return Buffer.from(buf).toString('base64');
}

function base64ToBuffer(str: string): Uint8Array {
  return new Uint8Array(Buffer.from(str, 'base64'));
}
