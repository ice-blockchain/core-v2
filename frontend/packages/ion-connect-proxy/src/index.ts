// High-level API (recommended)
export { createProxyManager } from './create-proxy-manager';
export type { ProxyManager, ProxyManagerConfig, ProxyStatus, AppStateProvider } from './types';

// Low-level API
export { startIonConnectProxy } from './start-ion-connect-proxy';
export { stopIonConnectProxy } from './stop-ion-connect-proxy';
export { createIonConnectProxyClient } from './create-ion-connect-proxy-client';
export type { IonConnectProxyConfig, StartIonConnectProxyOptions } from './types';
