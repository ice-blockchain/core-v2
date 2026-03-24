import type { NetworkError } from './network-error';

export interface QueuedRequest {
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  enqueuedAt: number;
  timeToLiveMs: number;
}

export interface RequestQueueConfig {
  maxSize: number;
  defaultTimeToLiveMs: number;
  replayDelayMs: number;
  storage: QueueStorage;
}

export interface QueueStorage {
  load(): Promise<QueuedRequest[]>;
  save(requests: QueuedRequest[]): Promise<void>;
  clear(): Promise<void>;
}

export interface ReplayResult {
  total: number;
  succeeded: number;
  failed: number;
  expired: number;
}

export interface RequestQueue {
  enqueue(request: QueuedRequest): Promise<void>;
  replay(): Promise<ReplayResult>;
  getSize(): Promise<number>;
  clear(): Promise<void>;
  onQueueChanged(handler: (size: number) => void): () => void;
  onReplayStarted(handler: () => void): () => void;
  onReplayCompleted(
    handler: (result: ReplayResult) => void,
  ): () => void;
  onReplayItemFailed(
    handler: (request: QueuedRequest, error: NetworkError) => void,
  ): () => void;
}
