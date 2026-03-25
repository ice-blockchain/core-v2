import type { QueuedRequest, RequestQueueConfig, QueueStorage, ReplayResult, RequestQueue } from './queue-types';
import { NetworkError } from './network-error';

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'proxy-authorization'];

export function createRequestQueue(
  config: RequestQueueConfig,
): RequestQueue {
  const handlers = createEventHandlers();
  let replayInProgress: Promise<ReplayResult> | null = null;
  const mutex = {
    get: () => replayInProgress,
    set: (p: Promise<ReplayResult> | null) => { replayInProgress = p; },
  };

  return {
    enqueue: (request) => enqueueRequest(config, handlers, request),
    replay: () => startReplay(config, handlers, mutex),
    getSize: () => getQueueSize(config.storage),
    clear: () => clearQueue(config.storage, handlers),
    onQueueChanged: (h) => addHandler(handlers.queueChanged, h),
    onReplayStarted: (h) => addHandler(handlers.replayStarted, h),
    onReplayCompleted: (h) => addHandler(handlers.replayCompleted, h),
    onReplayItemFailed: (h) => addHandler(handlers.replayItemFailed, h),
  };
}

interface EventHandlers {
  queueChanged: Set<(size: number) => void>;
  replayStarted: Set<() => void>;
  replayCompleted: Set<(result: ReplayResult) => void>;
  replayItemFailed: Set<(request: QueuedRequest, error: NetworkError) => void>;
}

interface ReplayMutex {
  get: () => Promise<ReplayResult> | null;
  set: (p: Promise<ReplayResult> | null) => void;
}

function createEventHandlers(): EventHandlers {
  return { queueChanged: new Set(), replayStarted: new Set(), replayCompleted: new Set(), replayItemFailed: new Set() };
}

function addHandler<T>(set: Set<T>, handler: T): () => void {
  set.add(handler);
  return () => { set.delete(handler); };
}

function stripSensitiveHeaders(
  headers?: Record<string, string>,
): Record<string, string> | undefined {
  if (!headers) return headers;
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

async function enqueueRequest(
  config: RequestQueueConfig,
  handlers: EventHandlers,
  request: QueuedRequest,
): Promise<void> {
  const sanitized = { ...request, id: crypto.randomUUID(), headers: stripSensitiveHeaders(request.headers) };
  const items = await config.storage.load();
  if (items.length >= config.maxSize) items.shift();
  items.push(sanitized);
  await config.storage.save(items);
  for (const handler of handlers.queueChanged) handler(items.length);
}

async function getQueueSize(storage: QueueStorage): Promise<number> {
  return (await storage.load()).length;
}

async function clearQueue(
  storage: QueueStorage,
  handlers: EventHandlers,
): Promise<void> {
  await storage.clear();
  for (const handler of handlers.queueChanged) handler(0);
}

async function startReplay(
  config: RequestQueueConfig,
  handlers: EventHandlers,
  mutex: ReplayMutex,
): Promise<ReplayResult> {
  const existing = mutex.get();
  if (existing) return existing;
  const promise = executeReplay(config, handlers);
  mutex.set(promise);
  try { return await promise; } finally { mutex.set(null); }
}

async function executeReplay(
  config: RequestQueueConfig,
  handlers: EventHandlers,
): Promise<ReplayResult> {
  for (const handler of handlers.replayStarted) handler();
  const items = await config.storage.load();
  const result: ReplayResult = { total: items.length, succeeded: 0, failed: 0, expired: 0 };
  for (const item of items) {
    const shouldContinue = await processReplayItem({ config, handlers, item }, result);
    if (!shouldContinue) break;
  }
  for (const handler of handlers.replayCompleted) handler(result);
  return result;
}

interface ReplayItemContext {
  config: RequestQueueConfig;
  handlers: EventHandlers;
  item: QueuedRequest;
}

async function processReplayItem(
  context: ReplayItemContext,
  result: ReplayResult,
): Promise<boolean> {
  if (isExpired(context.item)) {
    result.expired++;
    await removeItem(context.config.storage, context.item);
    return true;
  }
  const shouldContinue = await sendOrFail(context, result);
  if (shouldContinue && context.config.replayDelayMs > 0) await delay(context.config.replayDelayMs);
  return shouldContinue;
}

async function sendOrFail(
  context: ReplayItemContext,
  result: ReplayResult,
): Promise<boolean> {
  try {
    await executeReplayRequest(context);
    result.succeeded++;
    await removeItem(context.config.storage, context.item);
    return true;
  } catch (error) {
    return handleReplayError(context, result, error);
  }
}

async function executeReplayRequest(context: ReplayItemContext): Promise<void> {
  await context.config.replayFn(context.item);
}

function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof NetworkError)) return true;
  return error.code === 'NETWORK_OFFLINE' || error.code === 'NETWORK_TIMEOUT';
}

function handleReplayError(
  context: ReplayItemContext,
  result: ReplayResult,
  error: unknown,
): boolean {
  if (isNetworkFailure(error)) return false;
  result.failed++;
  const networkError = error instanceof NetworkError ? error : new NetworkError({ code: 'NETWORK_OFFLINE', message: 'Replay failed' });
  for (const handler of context.handlers.replayItemFailed) handler(context.item, networkError);
  return true;
}

function isExpired(request: QueuedRequest): boolean {
  return Date.now() - request.enqueuedAt > request.timeToLiveMs;
}

async function removeItem(
  storage: QueueStorage,
  item: QueuedRequest,
): Promise<void> {
  const items = await storage.load();
  const filtered = items.filter((i) => i.id !== item.id);
  await storage.save(filtered);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
