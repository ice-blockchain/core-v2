import type { LongPollClient, LongPollClientConfig, SyncRequest, SyncResponse, AdaptivePollingConfig, PayloadSerializer } from './long-poll-types';
import type { ConnectionStateMachine } from './connection-state';
import { createConnectionStateMachine } from './connection-state';
import type { RetryConfig } from './retry-types';

const DEFAULT_SERVER_HOLD_TIMEOUT_MS = 20_000;

const DEFAULT_ADAPTIVE: AdaptivePollingConfig = {
  minIntervalMs: 1000, maxIntervalMs: 30_000, idleIncrementMs: 2000, backgroundIntervalMs: 60_000,
};

const DEFAULT_LP_RETRY: RetryConfig = {
  maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30_000, jitterFactor: 0.5,
};

const JSON_SERIALIZER: PayloadSerializer = {
  serialize: (payload) => JSON.stringify(payload),
  deserialize: (data) => JSON.parse(data as string) as SyncResponse,
  contentType: 'application/json',
};

interface PollContext<TReceive> {
  config: LongPollClientConfig;
  machine: ConnectionStateMachine;
  serializer: PayloadSerializer;
  retryConfig: RetryConfig;
  adaptive: AdaptivePollingConfig;
  holdTimeout: number;
  cursor: string;
  currentIntervalMs: number;
  isBackground: boolean;
  errorCount: number;
  abortController: AbortController | null;
  pollTimerId: ReturnType<typeof setTimeout> | null;
  isPolling: boolean;
  messageHandlers: Set<(messages: TReceive[]) => void>;
  reconnectHandlers: Set<() => void>;
  cleanups: Array<() => void>;
}

export function createLongPollClient<TReceive = unknown>(
  config: LongPollClientConfig,
): LongPollClient<TReceive> {
  const adaptive = config.adaptivePolling ?? DEFAULT_ADAPTIVE;
  const ctx: PollContext<TReceive> = {
    config,
    machine: createConnectionStateMachine(),
    serializer: config.serializer ?? JSON_SERIALIZER,
    retryConfig: config.retryConfig ?? DEFAULT_LP_RETRY,
    adaptive,
    holdTimeout: config.serverHoldTimeoutMs ?? DEFAULT_SERVER_HOLD_TIMEOUT_MS,
    cursor: '', currentIntervalMs: adaptive.minIntervalMs,
    isBackground: false, errorCount: 0,
    abortController: null, pollTimerId: null, isPolling: false,
    messageHandlers: new Set(), reconnectHandlers: new Set(), cleanups: [],
  };

  return {
    connect: () => startPolling(ctx),
    disconnect: () => stopPolling(ctx),
    onMessage: (h) => addToSet(ctx.messageHandlers, h),
    onStateChange: (h) => ctx.machine.onStateChange(h),
    onReconnected: (h) => addToSet(ctx.reconnectHandlers, h),
    getState: () => ctx.machine.getState(),
  };
}

function addToSet<T>(set: Set<T>, handler: T): () => void {
  set.add(handler); return () => { set.delete(handler); };
}

function startPolling<T>(ctx: PollContext<T>): void {
  const state = ctx.machine.getState();
  if (state !== 'idle' && state !== 'disconnected') return;
  ctx.machine.transition('connecting');
  subscribeToNetworkState(ctx);
  schedulePoll(ctx, 0);
}

function stopPolling<T>(ctx: PollContext<T>): void {
  ctx.abortController?.abort();
  ctx.abortController = null;
  if (ctx.pollTimerId) { clearTimeout(ctx.pollTimerId); ctx.pollTimerId = null; }
  ctx.isPolling = false;
  for (const cleanup of ctx.cleanups) cleanup();
  ctx.cleanups.length = 0;
  const current = ctx.machine.getState();
  if (current !== 'idle' && current !== 'disconnected') ctx.machine.transition('disconnected');
}

function schedulePoll<T>(ctx: PollContext<T>, delayMs: number): void {
  ctx.pollTimerId = setTimeout(() => { executePollCycle(ctx); }, delayMs);
}

async function executePollCycle<T>(ctx: PollContext<T>): Promise<void> {
  if (ctx.isPolling) return;
  ctx.isPolling = true;
  ctx.abortController = new AbortController();
  ensureReconnectingState(ctx);
  try {
    const response = await executePollRequest(ctx);
    handlePollSuccess(ctx, response);
  } catch {
    handlePollError(ctx);
  } finally {
    ctx.isPolling = false;
  }
}

function ensureReconnectingState<T>(ctx: PollContext<T>): void {
  const state = ctx.machine.getState();
  if (state === 'disconnected') {
    ctx.machine.transition('reconnecting');
  }
}

async function executePollRequest<T>(ctx: PollContext<T>): Promise<SyncResponse> {
  const request: SyncRequest = { cursor: ctx.cursor, timeoutMs: ctx.holdTimeout };
  const body = ctx.serializer.serialize(request);
  return ctx.config.httpClient.post<SyncResponse>(ctx.config.url, {
    body,
    headers: { 'Content-Type': ctx.serializer.contentType },
    timeoutMs: ctx.holdTimeout + 5000,
    signal: ctx.abortController?.signal,
  });
}

function handlePollSuccess<T>(ctx: PollContext<T>, response: SyncResponse): void {
  const wasReconnecting = ctx.machine.getState() === 'reconnecting';
  transitionToConnected(ctx);
  if (wasReconnecting) {
    for (const handler of ctx.reconnectHandlers) handler();
  }
  ctx.errorCount = 0;
  ctx.cursor = response.cursor;
  deliverMessages(ctx, response);
  const nextInterval = computeNextInterval(ctx, response.inbox.length > 0, response.retryMs);
  ctx.currentIntervalMs = nextInterval;
  schedulePoll(ctx, nextInterval);
}

function transitionToConnected<T>(ctx: PollContext<T>): void {
  const state = ctx.machine.getState();
  if (state === 'connecting' || state === 'reconnecting') ctx.machine.transition('connected');
}

function deliverMessages<T>(ctx: PollContext<T>, response: SyncResponse): void {
  if (response.inbox.length === 0) return;
  const messages = response.inbox.map((item) => item.data as T);
  for (const handler of ctx.messageHandlers) handler(messages);
}

function handlePollError<T>(ctx: PollContext<T>): void {
  ctx.errorCount++;
  const state = ctx.machine.getState();
  if (state === 'connected') ctx.machine.transition('reconnecting');
  if (state === 'connecting') ctx.machine.transition('disconnected');
  const attempt = ctx.errorCount - 1;
  const exponential = Math.min(ctx.retryConfig.baseDelayMs * Math.pow(2, attempt), ctx.retryConfig.maxDelayMs);
  const backoff = exponential + Math.random() * ctx.retryConfig.jitterFactor * exponential;
  schedulePoll(ctx, backoff);
}

function computeNextInterval<T>(
  ctx: PollContext<T>,
  hasData: boolean,
  serverRetryMs?: number,
): number {
  if (serverRetryMs !== undefined) return serverRetryMs;
  if (ctx.isBackground) return ctx.adaptive.backgroundIntervalMs;
  if (hasData) return ctx.adaptive.minIntervalMs;
  return Math.min(ctx.currentIntervalMs + ctx.adaptive.idleIncrementMs, ctx.adaptive.maxIntervalMs);
}

function subscribeToNetworkState<T>(ctx: PollContext<T>): void {
  const provider = ctx.config.networkStateProvider;
  if (!provider) return;
  ctx.cleanups.push(provider.onStateChange((isOnline) => {
    if (isOnline) resumePolling(ctx);
    else pausePolling(ctx);
  }));
  ctx.cleanups.push(provider.onNetworkInterfaceChange(() => {
    triggerImmediateRepoll(ctx);
  }));
}

function pausePolling<T>(ctx: PollContext<T>): void {
  if (ctx.pollTimerId) { clearTimeout(ctx.pollTimerId); ctx.pollTimerId = null; }
  ctx.abortController?.abort();
}

function resumePolling<T>(ctx: PollContext<T>): void {
  const state = ctx.machine.getState();
  if (state === 'idle' || state === 'disconnected') return;
  schedulePoll(ctx, 0);
}

function triggerImmediateRepoll<T>(ctx: PollContext<T>): void {
  if (ctx.isPolling) return;
  if (ctx.pollTimerId) { clearTimeout(ctx.pollTimerId); ctx.pollTimerId = null; }
  schedulePoll(ctx, 0);
}
