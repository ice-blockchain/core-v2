import { createConnectionStateMachine, createHttpClient, createNetworkStateProvider } from '@ion/network';
import { createAppStateProvider } from '@ion/platform';
import { Logger } from '@ion/diagnostics';
import { startTonStorage } from './start-ton-storage';
import { setupStorageEventSubscriptions } from './storage-event-subscriptions';
import { restartStorage, stopStorageSilently } from './storage-lifecycle';
import { runStorageHealthCheck } from './storage-health-check';
import { createTonStorageClient } from './ton-storage-client';
import type { StorageManager, StorageManagerConfig, StorageManagerContext, StorageStatus } from './types';

const TAG = 'ton-storage';
const DEFAULT_API_PORT = 9090;
const DEFAULT_HEALTH_INTERVAL_MS = 30_000;
const DEFAULT_MAX_RESTART_ATTEMPTS = 3;
const DEFAULT_RESTART_BASE_DELAY_MS = 1_000;

export function createStorageManager(config: StorageManagerConfig): StorageManager {
  const stateMachine = createConnectionStateMachine();
  const context = buildContext(config, stateMachine);
  let cleanupSubscriptions: (() => void) | null = null;
  let lifecycleQueue: Promise<void> = Promise.resolve();

  function enqueueLifecycle(fn: () => Promise<void>): Promise<void> {
    lifecycleQueue = lifecycleQueue.then(fn, fn);
    return lifecycleQueue;
  }

  return {
    start: () => enqueueLifecycle(() => startManager(context, () => { cleanupSubscriptions = setupSubscriptions(context, config); })),
    stop: () => enqueueLifecycle(() => stopManager(context, () => { cleanupSubscriptions?.(); cleanupSubscriptions = null; })),
    getStatus: () => stateMachine.getState(),
    onStatusChange: (handler) => stateMachine.onStateChange(handler),
    createClient: () => createClientFromManager(context),
    dispose: () => { void enqueueLifecycle(() => disposeManager(context, () => { cleanupSubscriptions?.(); cleanupSubscriptions = null; })); },
  };
}

function buildContext(
  config: StorageManagerConfig,
  stateMachine: ReturnType<typeof createConnectionStateMachine>,
): StorageManagerContext {
  return {
    apiPort: config.apiPort ?? DEFAULT_API_PORT,
    dbPath: config.dbPath,
    globalConfigJSON: config.globalConfigJSON,
    healthCheckIntervalMs: config.healthCheckIntervalMs ?? DEFAULT_HEALTH_INTERVAL_MS,
    maxRestartAttempts: config.maxRestartAttempts ?? DEFAULT_MAX_RESTART_ATTEMPTS,
    restartBaseDelayMs: config.restartBaseDelayMs ?? DEFAULT_RESTART_BASE_DELAY_MS,
    transition: (to: StorageStatus) => {
      const from = stateMachine.getState();
      Logger.debug(`TON Storage state transition: ${from} -> ${to}`, { tag: TAG });
      stateMachine.transition(to);
    },
    getStatus: () => stateMachine.getState(),
    onStatusChange: (handler) => stateMachine.onStateChange(handler),
    isRestarting: false,
    restartPromise: null,
    healthTimerId: null,
    disposed: false,
  };
}

async function startManager(context: StorageManagerContext, onStarted: () => void): Promise<void> {
  context.transition('connecting');
  try {
    await startTonStorage({
      apiPort: context.apiPort,
      dbPath: context.dbPath,
      globalConfigJSON: context.globalConfigJSON,
    });
  } catch (error) {
    context.transition('disconnected');
    throw error;
  }
  if (context.disposed) return;
  context.transition('connected');
  onStarted();
  scheduleHealthCheck(context);
}

async function stopManager(context: StorageManagerContext, cleanup: () => void): Promise<void> {
  stopHealthCheck(context);
  cleanup();
  const status = context.getStatus();
  if (status !== 'idle' && status !== 'disconnected') {
    await stopStorageSilently();
    context.transition('disconnected');
  } else if (status === 'disconnected') {
    await stopStorageSilently();
  }
  Logger.info('TON Storage manager stopped', { tag: TAG });
}

async function disposeManager(context: StorageManagerContext, cleanup: () => void): Promise<void> {
  context.disposed = true;
  stopHealthCheck(context);
  cleanup();
  await stopStorageSilently();
  Logger.info('TON Storage manager disposed', { tag: TAG });
}

function setupSubscriptions(context: StorageManagerContext, config: StorageManagerConfig): () => void {
  return setupStorageEventSubscriptions(context, {
    networkStateProvider: config.networkStateProvider ?? createNetworkStateProvider(),
    appStateProvider: config.appStateProvider ?? createAppStateProvider(),
  });
}

function scheduleHealthCheck(context: StorageManagerContext): void {
  stopHealthCheck(context);
  context.healthTimerId = setInterval(() => void runPeriodicCheck(context), context.healthCheckIntervalMs);
}

function stopHealthCheck(context: StorageManagerContext): void {
  if (context.healthTimerId) {
    clearInterval(context.healthTimerId);
    context.healthTimerId = null;
  }
}

async function runPeriodicCheck(context: StorageManagerContext): Promise<void> {
  if (context.disposed || context.isRestarting || context.getStatus() !== 'connected') return;
  const isHealthy = await runStorageHealthCheck();
  if (!isHealthy && !context.disposed && !context.isRestarting) {
    Logger.warning('Periodic health check failed, restarting TON Storage', { tag: TAG });
    stopHealthCheck(context);
    await restartStorage(context);
    if (context.getStatus() === 'connected') scheduleHealthCheck(context);
  }
}

function createClientFromManager(context: StorageManagerContext): ReturnType<typeof createTonStorageClient> {
  const httpClient = createHttpClient({
    baseUrl: `http://127.0.0.1:${context.apiPort}`,
    httpsAllowlist: ['127.0.0.1'],
  });
  return createTonStorageClient(httpClient);
}
