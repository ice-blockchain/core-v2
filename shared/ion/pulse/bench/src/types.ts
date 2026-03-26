export interface BenchConfig {
  relayCount: number;
  clientCount: number;
  eventsPerClient: number;
  shardReplicationFactor: number;
}

export interface BenchScenarioResult {
  name: string;
  passed: boolean;
  durationMs: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface BenchReport {
  startedAt: number;
  completedAt: number;
  config: BenchConfig;
  results: BenchScenarioResult[];
  summary: BenchSummary;
}

export interface BenchSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
}

export type EventType = 'post' | 'message' | 'follow' | 'reaction' | 'media';

export interface GeneratedEvent {
  id: string;
  type: EventType;
  soul: string;
  userId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface GeneratorConfig {
  userId: string;
  eventCount: number;
  eventTypes?: EventType[];
  startTimestamp?: number;
}
