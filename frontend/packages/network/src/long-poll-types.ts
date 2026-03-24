import type { HttpClient } from './http-types';
import type { RetryConfig } from './retry-types';
import type { ConnectionState } from './shared-types';
import type { NetworkStateProvider } from './event-types';

export interface LongPollClient<TReceive = unknown> {
  connect(): void;
  disconnect(): void;
  onMessage(handler: (messages: TReceive[]) => void): () => void;
  onStateChange(handler: (state: ConnectionState) => void): () => void;
  onReconnected(handler: () => void): () => void;
  getState(): ConnectionState;
}

export interface LongPollClientConfig {
  url: string;
  httpClient: HttpClient;
  serverHoldTimeoutMs?: number;
  adaptivePolling?: AdaptivePollingConfig;
  retryConfig?: RetryConfig;
  serializer?: PayloadSerializer;
  networkStateProvider?: NetworkStateProvider | undefined;
}

export interface AdaptivePollingConfig {
  minIntervalMs: number;
  maxIntervalMs: number;
  idleIncrementMs: number;
  backgroundIntervalMs: number;
}

export interface PayloadSerializer {
  serialize(payload: SyncRequest): ArrayBuffer | string;
  deserialize(data: ArrayBuffer | string): SyncResponse;
  contentType: string;
}

export interface SyncRequest {
  cursor: string;
  timeoutMs: number;
}

export interface SyncResponse<TReceive = unknown> {
  inbox: Array<{ seq: string; data: TReceive }>;
  cursor: string;
  retryMs?: number;
}
