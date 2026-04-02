import { createConnectionStateMachine, createHttpClient } from '@ion/network';
import type { Transport, HttpClient } from '@ion/network';
import { Logger } from '@ion/diagnostics';
import { startIonConnectProxy } from './start-ion-connect-proxy';
import { stopIonConnectProxy } from './stop-ion-connect-proxy';
import { createIonConnectProxyTransport } from './ion-connect-proxy-transport';
import { setupEventSubscriptions } from './proxy-event-subscriptions';
import { restartProxy } from './proxy-lifecycle';
import { runProxyHealthCheck } from './proxy-health-check';
import { createResilientProxyTransport } from './resilient-proxy-transport';
import type { ProxyManager, ProxyManagerConfig, ProxyManagerContext, ProxyStatus } from './types';

const TAG = 'proxy';
const DEFAULT_PORT = 8888;
const DEFAULT_HEALTH_INTERVAL_MS = 30_000;
const DEFAULT_HEALTH_TIMEOUT_MS = 3_000;
const DEFAULT_MAX_RESTART_ATTEMPTS = 3;
const DEFAULT_RESTART_BASE_DELAY_MS = 1_000;

export function createProxyManager(config: ProxyManagerConfig): ProxyManager {
  const stateMachine = createConnectionStateMachine();
  const context = buildContext(config, stateMachine);
  let cleanupSubscriptions: (() => void) | null = null;

  return {
    start: () => startManager(context, () => { cleanupSubscriptions = setupSubscriptions(context, config); }),
    stop: () => stopManager(context, () => { cleanupSubscriptions?.(); cleanupSubscriptions = null; }),
    getStatus: () => stateMachine.getState(),
    onStatusChange: (handler) => stateMachine.onStateChange(handler),
    createTransport: () => buildResilientTransport(context),
    createClient: (options) => createClientFromManager(context, options),
    dispose: () => disposeManager(context, () => { cleanupSubscriptions?.(); cleanupSubscriptions = null; }),
  };
}

function buildContext(config: ProxyManagerConfig, stateMachine: ReturnType<typeof createConnectionStateMachine>): ProxyManagerContext {
  return {
    port: config.port ?? DEFAULT_PORT,
    configJSON: config.configJSON,
    healthCheckIntervalMs: config.healthCheckIntervalMs ?? DEFAULT_HEALTH_INTERVAL_MS,
    healthCheckTimeoutMs: config.healthCheckTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS,
    maxRestartAttempts: config.maxRestartAttempts ?? DEFAULT_MAX_RESTART_ATTEMPTS,
    restartBaseDelayMs: config.restartBaseDelayMs ?? DEFAULT_RESTART_BASE_DELAY_MS,
    transition: (to: ProxyStatus) => {
      const from = stateMachine.getState();
      Logger.debug(`Proxy state transition: ${from} -> ${to}`, { tag: TAG });
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

async function startManager(
  context: ProxyManagerContext,
  onStarted: () => void,
): Promise<void> {
  context.transition('connecting');
  await startIonConnectProxy({ port: context.port, configJSON: context.configJSON });
  context.transition('connected');
  onStarted();
  scheduleHealthCheck(context);
}

async function stopManager(context: ProxyManagerContext, cleanup: () => void): Promise<void> {
  stopHealthCheck(context);
  cleanup();
  if (context.getStatus() !== 'idle') {
    try { await stopIonConnectProxy(); } catch { /* proxy may already be stopped */ }
    context.transition('disconnected');
  }
  Logger.info('Proxy manager stopped', { tag: TAG });
}

function disposeManager(context: ProxyManagerContext, cleanup: () => void): void {
  context.disposed = true;
  stopHealthCheck(context);
  cleanup();
  Logger.info('Proxy manager disposed', { tag: TAG });
}

function setupSubscriptions(context: ProxyManagerContext, config: ProxyManagerConfig): () => void {
  return setupEventSubscriptions(context, {
    networkStateProvider: config.networkStateProvider,
    appStateProvider: config.appStateProvider,
  });
}

function scheduleHealthCheck(context: ProxyManagerContext): void {
  stopHealthCheck(context);
  context.healthTimerId = setInterval(() => void runPeriodicCheck(context), context.healthCheckIntervalMs);
}

function stopHealthCheck(context: ProxyManagerContext): void {
  if (context.healthTimerId) {
    clearInterval(context.healthTimerId);
    context.healthTimerId = null;
  }
}

async function runPeriodicCheck(context: ProxyManagerContext): Promise<void> {
  if (context.disposed || context.isRestarting || context.getStatus() !== 'connected') return;
  const isHealthy = await runProxyHealthCheck(context.healthCheckTimeoutMs);
  if (!isHealthy && !context.disposed && !context.isRestarting) {
    Logger.warning('Periodic health check failed, restarting', { tag: TAG });
    stopHealthCheck(context);
    await restartProxy(context);
    if (context.getStatus() === 'connected') scheduleHealthCheck(context);
  }
}

function buildResilientTransport(context: ProxyManagerContext): Transport {
  const innerTransport = createIonConnectProxyTransport();
  return createResilientProxyTransport({
    innerTransport,
    onFailure: () => {
      if (!context.isRestarting && context.getStatus() === 'connected') {
        stopHealthCheck(context);
        void restartProxy(context).then(() => {
          if (context.getStatus() === 'connected') scheduleHealthCheck(context);
        });
      }
    },
    onStatusChange: (handler) => context.onStatusChange(handler),
  });
}

function createClientFromManager(context: ProxyManagerContext, options: { baseUrl: string }): HttpClient {
  const transport = buildResilientTransport(context);
  return createHttpClient({ baseUrl: options.baseUrl, transport });
}
