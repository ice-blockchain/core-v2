import type { ConnectionState, NetworkStateProvider, Transport, HttpClient } from '@ion/network';

// --- Proxy Config ---

export interface IonConnectProxyConfig {
  liteservers: Array<{ ip: number; port: number; id: { '@type': string; key: string } }>;
  dht?: {
    '@type': string;
    nodes: Array<{ '@type': string; id: { '@type': string; key: string }; addr_list: unknown }>;
  } | undefined;
}

export interface StartIonConnectProxyOptions {
  port?: number | undefined;
  config?: IonConnectProxyConfig | undefined;
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
  config?: IonConnectProxyConfig | undefined;
  networkStateProvider?: NetworkStateProvider | undefined;
  appStateProvider?: AppStateProvider | undefined;
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
  proxyConfig?: IonConnectProxyConfig | undefined;
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
