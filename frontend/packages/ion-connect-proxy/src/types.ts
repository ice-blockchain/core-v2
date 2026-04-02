import type { ConnectionState, NetworkStateProvider, Transport, HttpClient } from '@ion/network';

// --- Proxy Config ---

/** Raw JSON string of the TON global config. Passed directly to the native module to avoid JS number precision loss on int64 fields. */
export type TonGlobalConfigJSON = string;

export interface StartIonConnectProxyOptions {
  port?: number | undefined;
  configJSON?: TonGlobalConfigJSON | undefined;
}

// --- App State Provider (DI interface for @ion/platform) ---

export type ProxyAppState = 'active' | 'inactive' | 'background';

export interface AppStateProvider {
  getCurrentState(): ProxyAppState;
  onStateChange(handler: (state: ProxyAppState) => void): () => void;
}

// --- Proxy Manager ---

export type ProxyStatus = ConnectionState;

export interface ProxyManagerConfig {
  port?: number | undefined;
  configJSON?: TonGlobalConfigJSON | undefined;
  networkStateProvider: NetworkStateProvider;
  appStateProvider: AppStateProvider;
  healthCheckIntervalMs?: number | undefined;
  healthCheckTimeoutMs?: number | undefined;
  maxRestartAttempts?: number | undefined;
  restartBaseDelayMs?: number | undefined;
}

export interface ProxyManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): ProxyStatus;
  onStatusChange(handler: (status: ProxyStatus) => void): () => void;
  createTransport(): Transport;
  createClient(options: { baseUrl: string }): HttpClient;
  dispose(): void;
}

// --- Internal shared context ---

export interface ProxyManagerContext {
  port: number;
  configJSON?: TonGlobalConfigJSON | undefined;
  healthCheckIntervalMs: number;
  healthCheckTimeoutMs: number;
  maxRestartAttempts: number;
  restartBaseDelayMs: number;
  transition(to: ProxyStatus): void;
  getStatus(): ProxyStatus;
  onStatusChange(handler: (status: ProxyStatus) => void): () => void;
  isRestarting: boolean;
  restartPromise: Promise<void> | null;
  healthTimerId: ReturnType<typeof setInterval> | null;
  disposed: boolean;
}
