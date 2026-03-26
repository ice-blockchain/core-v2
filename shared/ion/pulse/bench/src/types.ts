import type { ChildProcess } from 'node:child_process';

export interface PulseBenchConfig {
  readonly relayCount?: number;
  readonly clientCount?: number;
  readonly eventsPerClient?: number;
  readonly replicationFactor?: number;
}

export interface PulseBenchResult {
  readonly scenario: string;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly metrics?: Record<string, number>;
  readonly error?: string;
}

export interface PulseBenchSuite {
  readonly run: (scenarioName: string) => Promise<PulseBenchResult>;
  readonly runAll: () => Promise<PulseBenchResult[]>;
  readonly getAvailableScenarios: () => string[];
}

export interface RelayInstance {
  readonly id: string;
  readonly port: number;
  readonly peerId: string;
  process: ChildProcess | null;
}

export interface RelayClusterConfig {
  readonly relayCount: number;
  readonly basePort: number;
  readonly replicationFactor: number;
}

export interface ClientWorkerMetrics {
  requestCount: number;
  errorCount: number;
  latencies: number[];
}

export interface ClientWorkerConfig {
  readonly relayUrl: string;
  readonly userId?: string;
}

export interface ClientWorkerInstance {
  readonly userId: string;
  readonly putNode: (
    soul: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  readonly getNode: (
    soul: string,
  ) => Promise<Record<string, unknown> | null>;
  readonly deleteNode: (soul: string) => Promise<void>;
  readonly queryNodes: (
    prefix: string,
  ) => Promise<Record<string, unknown>[]>;
  readonly getMetrics: () => ClientWorkerMetrics;
  readonly stop: () => void;
}
